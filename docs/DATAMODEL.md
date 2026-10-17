# Datamodel

Typerne er defineret i `src/domain/types.ts`. Produktionsskemaet ligger i [`db/schema.sql`](../db/schema.sql) (PostgreSQL; kører **ikke** på GitHub Pages). Skemaet er afprøvet ved at køre det mod en lokal PostgreSQL 16 (37 tabeller oprettet uden fejl).

## Entiteter

| Entitet | Type i koden | Tabel | Nøgle og vigtigste relationer | Historik |
|---|---|---|---|---|
| Organisation | `Organization` | `organization` | Rod for alle data (multi-tenant) | – |
| Forretningsenhed | `BusinessUnit` | `business_unit` | → organisation | `valid_from/valid_to` |
| Strategisk mål | `StrategicGoal` | `strategic_goal`, `milestone` | ejer = rolle; milepæle | planlagt/gennemført dato |
| Kapabilitet | `Capability` | `capability`, `capability_goal`, `capability_capacity` | → enhed; n:m mål | kapacitet pr. opgørelsesdato |
| Rolle | `Role` | `role`, `role_capability` | → enhed; n:m kapabiliteter | `valid_from/valid_to` |
| Person | `Person` | `person` | → enhed | ansættelsesperiode |
| Rollebesættelse | `Assignment` | `role_assignment` | rolle + person | start/slut; ingen overlap pr. rolle (exclusion constraint) |
| Vidensområde | `KnowledgeArea` | `knowledge_area`, `knowledge_capability`, `knowledge_documentation`, `knowledge_holder` | → enhed; n:m kapabiliteter | dokumentation pr. vurderingsdato; holdere med periode |
| Afhængighed | `Finding` (afledt) | – (beregnes) | mål → kapabilitet → rolle → person → viden | beregnes pr. dato |
| Successionsplan | `SuccessionPlan` | `succession_plan`, `succession_plan_review` | én pr. rolle; ejer = rolle | etableringsdato, reviews |
| Efterfølgerkandidat | `SuccessorCandidate` | `successor_candidate`, `readiness_assessment` | plan + person | periode; daterede beredskabsvurderinger |
| Evidens | `Evidence` | `evidence`, `readiness_assessment_evidence` | person/rolle/kapabilitet/viden | start/slut; kilde |
| Vurdering | `Assessment`, `ReadinessAssessment` | `assessment`, `readiness_assessment` | vurderende rolle; grundlag | dato |
| Praksis (kultur) | `CulturePractice` | `culture_practice` m.fl. | enheder, ejerrolle, bærere | registrering, beskrevet, gennemførelse pr. periode |
| Risiko | `Risk` (afledt) | snapshot i `score_snapshot.risks` | deterministisk nøgle, fx `VID-K01` | beregnes pr. dato |
| Risikobehandling | `RiskTreatment` | `risk_treatment`, `risk_treatment_action` | risikonøgle, ejerrolle, handlinger | opdateringstid + auditlog |
| Handling | `Action` | `action`, `action_risk` | ejerrolle; risici; forventede ændringer | start/frist/status |
| Scenarie | `ScenarioChange[]` | `scenario` | ændringer som JSON | oprettet |
| Score-snapshot | `Snapshot` (afledt) | `score_snapshot` | organisation/enhed + dato + modelversion | ét pr. måned |
| Modelversion | `ModelConfig` | `model_version` | version | gyldig fra |

## Validering

`src/data/validate.ts` kontrollerer ved indlæsning og i test:

- unikke id'er pr. entitet og gyldige ISO-datoer,
- alle referencer (enhed, mål, kapabilitet, rolle, person, evidens, handling),
- slutdato ikke før startdato; besættelser og vidensholdere inden for ansættelsen,
- ingen overlappende besættelser af samme rolle,
- skalaer (kritikalitet 1–5, dokumentation 0–3, gennemførelse 0–1, ikke-negativ kapacitet),
- højst én successionsplan pr. rolle,
- dokumenterede vurderinger skal henvise til evidens,
- handlinger uden modelleret effekt skal have en forklaring.

Fejl vises som fejltilstand i applikationen i stedet for forkerte tal.

## Demonstrationsdata

Halbjerg Flowteknik A/S (fiktiv): 5 enheder, 26 nøgle- og lederroller, 42 fiktive personer, 10 kapabiliteter, 10 vidensområder, 23 successionsplaner, 9 praksisser, 8 handlinger og 13 måneders historik (sep. 2025–sep. 2026). Fortællingen: stærk drift i Produktion, men sårbar viden og utilstrækkelig succession i de vækstkritiske områder Digitale Services og Teknologi. Bevidste datahuller: én kritisk rolle uden successionsplan, Koncernfunktioner uden praksisregister, praksisregistret først fra februar 2026 og én forældet dokumentationsvurdering.
