-- =============================================================================
-- Human Capital Sustainability™ – databaseskema til en FREMTIDIG produktionsløsning
-- =============================================================================
-- VIGTIGT: Dette skema kører IKKE på GitHub Pages. Demonstrationen er statisk og
-- har hverken database, backend, login eller sikker opbevaring af persondata.
-- Skemaet er et udgangspunkt for en produktionsarkitektur (se docs/ARKITEKTUR.md).
--
-- Mål: PostgreSQL 15+.
-- Principper:
--   * Flere organisationer (multi-tenant): alle forretningstabeller har organization_id,
--     og adgang afgrænses med Row Level Security (RLS) pr. organisation.
--   * Historik: tidsafhængige forhold lagres som daterede rækker (valid_from/valid_to
--     eller målingsdato), så enhver historisk score kan genberegnes.
--   * Dataminimering: person-tabellen indeholder kun det nødvendige. Ingen alder,
--     helbred, private forhold eller andre personlige karakteristika.
--   * Sporbarhed: vurderinger og evidens har kilde, dato og ansvarlig rolle;
--     alle ændringer logges i audit_log.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Organisation, brugere og adgang
-- -----------------------------------------------------------------------------
CREATE TABLE organization (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  industry        text,
  strategy_name   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE app_role AS ENUM ('bestyrelse', 'direktion', 'enhedsleder', 'hr_analytiker', 'administrator', 'revisor');

CREATE TABLE app_user (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  external_id     text NOT NULL,              -- id fra identitetsudbyder (SSO/OIDC)
  display_name    text NOT NULL,
  email           text NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, external_id)
);

CREATE TABLE user_role (
  user_id         uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role            app_role NOT NULL,
  -- Afgrænsning til én forretningsenhed (NULL = hele organisationen).
  business_unit_id uuid,
  PRIMARY KEY (user_id, role, business_unit_id)
);

-- -----------------------------------------------------------------------------
-- Struktur
-- -----------------------------------------------------------------------------
CREATE TABLE business_unit (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  code            text NOT NULL,
  name            text NOT NULL,
  short_name      text NOT NULL,
  description     text,
  growth_critical boolean NOT NULL DEFAULT false,
  valid_from      date NOT NULL,
  valid_to        date,
  UNIQUE (organization_id, code),
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

ALTER TABLE user_role
  ADD CONSTRAINT user_role_unit_fk FOREIGN KEY (business_unit_id) REFERENCES business_unit(id);

CREATE TABLE strategic_goal (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  code            text NOT NULL,
  title           text NOT NULL,
  description     text,
  deadline        date NOT NULL,
  owner_role_id   uuid,                        -- FK tilføjes efter role
  UNIQUE (organization_id, code)
);

CREATE TABLE milestone (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id         uuid NOT NULL REFERENCES strategic_goal(id) ON DELETE CASCADE,
  title           text NOT NULL,
  planned_date    date NOT NULL,
  completed_date  date
);

CREATE TABLE capability (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  business_unit_id uuid NOT NULL REFERENCES business_unit(id),
  code            text NOT NULL,
  name            text NOT NULL,
  description     text,
  capacity_source text NOT NULL,               -- fx "Ressourceplan (økonomi)"
  UNIQUE (organization_id, code)
);

CREATE TABLE capability_goal (
  capability_id   uuid NOT NULL REFERENCES capability(id) ON DELETE CASCADE,
  goal_id         uuid NOT NULL REFERENCES strategic_goal(id) ON DELETE CASCADE,
  PRIMARY KEY (capability_id, goal_id)
);

-- Kapacitet over tid (årsværk). Én række pr. opgørelse.
CREATE TABLE capability_capacity (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_id   uuid NOT NULL REFERENCES capability(id) ON DELETE CASCADE,
  measured_on     date NOT NULL,
  current_fte     numeric(6,2) NOT NULL CHECK (current_fte >= 0),
  required_fte    numeric(6,2) NOT NULL CHECK (required_fte >= 0),
  UNIQUE (capability_id, measured_on)
);

CREATE TYPE role_kind AS ENUM ('direktion', 'leder', 'nøglespecialist');

CREATE TABLE role (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  business_unit_id uuid NOT NULL REFERENCES business_unit(id),
  code            text NOT NULL,
  title           text NOT NULL,
  kind            role_kind NOT NULL,
  is_leadership   boolean NOT NULL,
  criticality     smallint NOT NULL CHECK (criticality BETWEEN 1 AND 5),
  recruit_months  smallint NOT NULL CHECK (recruit_months >= 0),
  ramp_up_months  smallint NOT NULL CHECK (ramp_up_months >= 0),
  valid_from      date NOT NULL,
  valid_to        date,
  UNIQUE (organization_id, code)
);

ALTER TABLE strategic_goal
  ADD CONSTRAINT goal_owner_fk FOREIGN KEY (owner_role_id) REFERENCES role(id);

CREATE TABLE role_capability (
  role_id         uuid NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  capability_id   uuid NOT NULL REFERENCES capability(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, capability_id)
);

-- -----------------------------------------------------------------------------
-- Personer og rollebesættelser (dataminimeret)
-- -----------------------------------------------------------------------------
CREATE TABLE person (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  hr_reference    text NOT NULL,               -- reference til HR-systemet (ikke CPR)
  display_name    text NOT NULL,
  business_unit_id uuid NOT NULL REFERENCES business_unit(id),
  job_title       text NOT NULL,
  employed_from   date NOT NULL,
  employed_to     date,
  UNIQUE (organization_id, hr_reference),
  CHECK (employed_to IS NULL OR employed_to >= employed_from)
);

CREATE TYPE onboarding_quality AS ENUM ('struktureret', 'delvis', 'ingen');

CREATE TABLE role_assignment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id         uuid NOT NULL REFERENCES role(id),
  person_id       uuid NOT NULL REFERENCES person(id),
  start_date      date NOT NULL,
  end_date        date,
  source          text NOT NULL CHECK (source IN ('intern', 'ekstern')),
  onboarding      onboarding_quality,          -- NULL = ikke registreret (manglende data)
  CHECK (end_date IS NULL OR end_date >= start_date)
);
-- Én aktiv indehaver pr. rolle ad gangen (kræver btree_gist).
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE role_assignment ADD CONSTRAINT role_assignment_no_overlap
  EXCLUDE USING gist (role_id WITH =, daterange(start_date, COALESCE(end_date, 'infinity'::date), '[]') WITH &&);

-- -----------------------------------------------------------------------------
-- Kritisk viden
-- -----------------------------------------------------------------------------
CREATE TABLE knowledge_area (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  business_unit_id uuid NOT NULL REFERENCES business_unit(id),
  code            text NOT NULL,
  name            text NOT NULL,
  description     text,
  criticality     smallint NOT NULL CHECK (criticality BETWEEN 1 AND 5),
  base_rebuild_months smallint NOT NULL CHECK (base_rebuild_months > 0),
  UNIQUE (organization_id, code)
);

CREATE TABLE knowledge_capability (
  knowledge_id    uuid NOT NULL REFERENCES knowledge_area(id) ON DELETE CASCADE,
  capability_id   uuid NOT NULL REFERENCES capability(id) ON DELETE CASCADE,
  PRIMARY KEY (knowledge_id, capability_id)
);

CREATE TABLE knowledge_documentation (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id    uuid NOT NULL REFERENCES knowledge_area(id) ON DELETE CASCADE,
  assessed_on     date NOT NULL,
  level           smallint NOT NULL CHECK (level BETWEEN 0 AND 3),
  assessor_role_id uuid NOT NULL REFERENCES role(id)
);

CREATE TYPE holder_level AS ENUM ('ekspert', 'praktiker', 'under oplæring');

CREATE TABLE knowledge_holder (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id    uuid NOT NULL REFERENCES knowledge_area(id) ON DELETE CASCADE,
  person_id       uuid NOT NULL REFERENCES person(id),
  level           holder_level NOT NULL,
  valid_from      date NOT NULL,
  valid_to        date,
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

-- -----------------------------------------------------------------------------
-- Succession, evidens og vurderinger
-- -----------------------------------------------------------------------------
CREATE TABLE succession_plan (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id         uuid NOT NULL UNIQUE REFERENCES role(id) ON DELETE CASCADE,
  owner_role_id   uuid NOT NULL REFERENCES role(id),
  established_on  date NOT NULL
);

CREATE TABLE succession_plan_review (
  plan_id         uuid NOT NULL REFERENCES succession_plan(id) ON DELETE CASCADE,
  reviewed_on     date NOT NULL,
  reviewed_by     uuid REFERENCES app_user(id),
  PRIMARY KEY (plan_id, reviewed_on)
);

CREATE TABLE successor_candidate (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         uuid NOT NULL REFERENCES succession_plan(id) ON DELETE CASCADE,
  person_id       uuid NOT NULL REFERENCES person(id),
  valid_from      date NOT NULL,
  valid_to        date,
  development_needs text[] NOT NULL DEFAULT '{}'
);

CREATE TYPE evidence_type AS ENUM ('udviklingsforløb', 'uddelegeret-ansvar', 'projektleverance', 'certificering', 'videnoverdragelse', 'omstillingsforløb');

CREATE TABLE evidence (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  type            evidence_type NOT NULL,
  title           text NOT NULL,
  person_id       uuid REFERENCES person(id),
  role_id         uuid REFERENCES role(id),
  capability_id   uuid REFERENCES capability(id),
  knowledge_id    uuid REFERENCES knowledge_area(id),
  start_date      date NOT NULL,
  end_date        date,
  source          text NOT NULL,               -- system eller rolle, der har registreret
  registered_by   uuid REFERENCES app_user(id),
  registered_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE readiness AS ENUM ('nu', '1-2', '3-5');
CREATE TYPE assessment_basis AS ENUM ('dokumenteret', 'vurdering');

CREATE TABLE readiness_assessment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    uuid NOT NULL REFERENCES successor_candidate(id) ON DELETE CASCADE,
  assessed_on     date NOT NULL,
  readiness       readiness NOT NULL,
  basis           assessment_basis NOT NULL,
  assessor_role_id uuid NOT NULL REFERENCES role(id)
);

CREATE TABLE readiness_assessment_evidence (
  assessment_id   uuid NOT NULL REFERENCES readiness_assessment(id) ON DELETE CASCADE,
  evidence_id     uuid NOT NULL REFERENCES evidence(id),
  PRIMARY KEY (assessment_id, evidence_id)
);

-- Generelle vurderinger: fremtidig betydning af kapabiliteter og vurderet sandsynlighed
-- for organisatoriske hændelser. Sandsynlighed for enkeltpersoners afgang må IKKE registreres.
CREATE TABLE assessment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN ('fremtidig-betydning', 'sandsynlighed')),
  subject_type    text NOT NULL CHECK (subject_type IN ('kapabilitet', 'risiko')),
  subject_id      text NOT NULL,
  value           smallint NOT NULL CHECK (value BETWEEN 1 AND 5),
  assessed_on     date NOT NULL,
  assessor_role_id uuid NOT NULL REFERENCES role(id),
  basis           assessment_basis NOT NULL,
  rationale       text NOT NULL
);

-- -----------------------------------------------------------------------------
-- Kultur som praksis
-- -----------------------------------------------------------------------------
CREATE TABLE culture_practice (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  category        text NOT NULL CHECK (category IN ('videndeling', 'onboarding', 'tværgående samarbejde', 'beslutningsrutine', 'læringsrutine', 'arbejdspraksis')),
  importance      smallint NOT NULL CHECK (importance BETWEEN 1 AND 5),
  registered_on   date NOT NULL,
  owner_role_id   uuid REFERENCES role(id)
);

CREATE TABLE culture_practice_unit (
  practice_id     uuid NOT NULL REFERENCES culture_practice(id) ON DELETE CASCADE,
  business_unit_id uuid NOT NULL REFERENCES business_unit(id),
  PRIMARY KEY (practice_id, business_unit_id)
);

CREATE TABLE culture_practice_documented (
  practice_id     uuid NOT NULL REFERENCES culture_practice(id) ON DELETE CASCADE,
  valid_from      date NOT NULL,
  documented      boolean NOT NULL,
  PRIMARY KEY (practice_id, valid_from)
);

CREATE TABLE culture_practice_carrier (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id     uuid NOT NULL REFERENCES culture_practice(id) ON DELETE CASCADE,
  person_id       uuid NOT NULL REFERENCES person(id),
  valid_from      date NOT NULL,
  valid_to        date
);

-- Aggregeret gennemførelse pr. periode. Ingen mødeindhold, ingen individdata.
CREATE TABLE culture_practice_adherence (
  practice_id     uuid NOT NULL REFERENCES culture_practice(id) ON DELETE CASCADE,
  period_end      date NOT NULL,
  share_held      numeric(4,3) NOT NULL CHECK (share_held BETWEEN 0 AND 1),
  PRIMARY KEY (practice_id, period_end)
);

-- -----------------------------------------------------------------------------
-- Risici, behandling og handlinger
-- -----------------------------------------------------------------------------
-- Risici beregnes af modellen og gemmes som snapshot pr. beregning (se score_snapshot).
-- Ledelsens behandling knyttes til risikoens deterministiske nøgle (fx "VID-<id>").
CREATE TYPE risk_status AS ENUM ('åben', 'under behandling', 'delvist afværget', 'accepteret');

CREATE TABLE risk_treatment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  risk_key        text NOT NULL,
  status          risk_status NOT NULL,
  owner_role_id   uuid NOT NULL REFERENCES role(id),
  follow_up_on    date NOT NULL,
  mitigations     text[] NOT NULL DEFAULT '{}',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, risk_key)
);

CREATE TYPE action_status AS ENUM ('planlagt', 'igangsat', 'gennemført', 'forsinket');

CREATE TABLE action (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  owner_role_id   uuid NOT NULL REFERENCES role(id),
  start_date      date NOT NULL,
  due_date        date NOT NULL,
  status          action_status NOT NULL,
  -- Forventet effekt som scenarieændringer (JSON valideret i backend mod skema).
  expected_changes jsonb NOT NULL DEFAULT '[]',
  effect_note     text,
  CHECK (due_date >= start_date)
);

CREATE TABLE action_risk (
  action_id       uuid NOT NULL REFERENCES action(id) ON DELETE CASCADE,
  risk_key        text NOT NULL,
  PRIMARY KEY (action_id, risk_key)
);

CREATE TABLE risk_treatment_action (
  treatment_id    uuid NOT NULL REFERENCES risk_treatment(id) ON DELETE CASCADE,
  action_id       uuid NOT NULL REFERENCES action(id) ON DELETE CASCADE,
  PRIMARY KEY (treatment_id, action_id)
);

-- -----------------------------------------------------------------------------
-- Scenarier, modelversioner og score-snapshots
-- -----------------------------------------------------------------------------
CREATE TABLE scenario (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  changes         jsonb NOT NULL,              -- anvendes altid på en kopi; grunddata ændres ikke
  created_by      uuid REFERENCES app_user(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE model_version (
  version         text PRIMARY KEY,            -- fx '1.1'
  valid_from      date NOT NULL,
  change_note     text NOT NULL,
  config          jsonb NOT NULL,              -- vægte, tærskler og normalisering
  approved_by     uuid REFERENCES app_user(id),
  approved_at     timestamptz
);

CREATE TABLE score_snapshot (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  business_unit_id uuid REFERENCES business_unit(id),   -- NULL = hele organisationen
  as_of           date NOT NULL,
  model_version   text NOT NULL REFERENCES model_version(version),
  ors             numeric(5,2),                         -- NULL = utilstrækkeligt datagrundlag
  weighted_mean   numeric(5,2),
  cap             numeric(5,2),
  coverage        numeric(4,3) NOT NULL,
  dimensions      jsonb NOT NULL,                       -- score, dækning og indikatorer pr. dimension
  risks           jsonb NOT NULL,                       -- beregnede risici på datoen
  data_fingerprint text NOT NULL,                       -- hash af grunddata, så genberegning kan verificeres
  computed_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, business_unit_id, as_of, model_version)
);

-- -----------------------------------------------------------------------------
-- Auditlog (append-only)
-- -----------------------------------------------------------------------------
CREATE TABLE audit_log (
  id              bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organization(id),
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  user_id         uuid REFERENCES app_user(id),
  action          text NOT NULL CHECK (action IN ('read', 'create', 'update', 'delete', 'export', 'login')),
  entity          text NOT NULL,
  entity_id       text,
  details         jsonb
);
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- Row Level Security: brugere ser kun egen organisation (eksempel på to tabeller;
-- samme mønster gælder alle tabeller med organization_id).
-- Backend sætter: SET app.organization_id = '<uuid>' pr. forespørgsel.
-- -----------------------------------------------------------------------------
ALTER TABLE person ENABLE ROW LEVEL SECURITY;
CREATE POLICY person_tenant ON person USING (organization_id = current_setting('app.organization_id')::uuid);

ALTER TABLE risk_treatment ENABLE ROW LEVEL SECURITY;
CREATE POLICY risk_treatment_tenant ON risk_treatment USING (organization_id = current_setting('app.organization_id')::uuid);

-- Indekser til hyppige opslag på dato.
CREATE INDEX ON role_assignment (role_id, start_date);
CREATE INDEX ON knowledge_holder (knowledge_id, valid_from);
CREATE INDEX ON readiness_assessment (candidate_id, assessed_on);
CREATE INDEX ON capability_capacity (capability_id, measured_on);
CREATE INDEX ON evidence (person_id, start_date);
CREATE INDEX ON audit_log (organization_id, occurred_at);
