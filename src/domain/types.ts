/**
 * Domænetyper for Human Capital Sustainability™.
 *
 * Analyseenheden er organisationen, forretningsenheden, den kritiske rolle og
 * den organisatoriske kapabilitet. Personer optræder kun som indehavere af
 * roller, viden og dokumenteret evidens – aldrig som objekter for en samlet
 * numerisk værdivurdering.
 *
 * Datoer er ISO-strenge (YYYY-MM-DD). Tidsafhængige værdier lagres som
 * daterede forløb, så alle historiske tal kan genberegnes fra grunddata.
 */

export type Id = string;
export type ISODate = string;

/** Skala 1–5 for vurderinger (kritikalitet, fremtidig betydning m.m.). */
export type Scale5 = 1 | 2 | 3 | 4 | 5;

/** Dokumentationsniveau for et vidensområde. */
export type DocLevel = 0 | 1 | 2 | 3;

/** Beredskab for en efterfølgerkandidat. */
export type Readiness = 'nu' | '1-2' | '3-5';

/** Grundlaget for en vurdering: dokumenteret evidens eller menneskelig vurdering. */
export type Basis = 'dokumenteret' | 'vurdering';

export interface Dated<T> {
  date: ISODate;
  value: T;
}

export type Timeline<T> = Dated<T>[];

export interface Organization {
  id: Id;
  name: string;
  industry: string;
  employees: number;
  strategyName: string;
  description: string;
  /** Markerer eksplicit, at organisationen er fiktiv (demonstrationsdata). */
  fictional: boolean;
}

export interface BusinessUnit {
  id: Id;
  orgId: Id;
  name: string;
  shortName: string;
  description: string;
  /** Enheden er afgørende for strategiens vækstmål. */
  growthCritical: boolean;
}

export interface Milestone {
  id: Id;
  title: string;
  planned: ISODate;
  completed: ISODate | null;
}

export interface StrategicGoal {
  id: Id;
  code: string;
  title: string;
  description: string;
  deadline: ISODate;
  ownerRoleId: Id;
  milestones: Milestone[];
}

export interface CapacityPoint {
  /** Faktisk kapacitet i årsværk (FTE). */
  current: number;
  /** Krævet kapacitet i årsværk ifølge strategi- og ressourceplan. */
  required: number;
}

export interface Capability {
  id: Id;
  unitId: Id;
  name: string;
  description: string;
  goalIds: Id[];
  /** Kapacitetsforløb fra ressourceplanen. */
  capacity: Timeline<CapacityPoint>;
  /** Kilde til kapacitetsdata. */
  capacitySource: string;
}

export type RoleKind = 'direktion' | 'leder' | 'nøglespecialist';

export interface Role {
  id: Id;
  unitId: Id;
  title: string;
  kind: RoleKind;
  /** Rollen er en lederrolle (indgår i Leadership Pipeline Engine™). */
  leadership: boolean;
  /** Rollens kritikalitet for driften og strategien (1–5) – direktionens vurdering. */
  criticality: Scale5;
  capabilityIds: Id[];
  /** Forventet rekrutteringstid i måneder ved ekstern besættelse. */
  recruitMonths: number;
  /** Forventet indkøringstid i måneder for en ny rolleindehaver. */
  rampUpMonths: number;
}

export interface Person {
  id: Id;
  /** Fiktivt navn. */
  name: string;
  unitId: Id;
  /** Stillingsbetegnelse (ikke nødvendigvis en nøglerolle). */
  title: string;
  employedFrom: ISODate;
  employedTo: ISODate | null;
}

export type OnboardingQuality = 'struktureret' | 'delvis' | 'ingen';

/** Rollebesættelse: en person besætter en rolle i en periode. */
export interface Assignment {
  id: Id;
  roleId: Id;
  personId: Id;
  start: ISODate;
  end: ISODate | null;
  source: 'intern' | 'ekstern';
  /** Registreret onboarding (kun for besættelser efter registerets start). */
  onboarding: OnboardingQuality | null;
}

export type HolderLevel = 'ekspert' | 'praktiker' | 'under oplæring';

export interface KnowledgeHolder {
  personId: Id;
  level: HolderLevel;
  from: ISODate;
  to: ISODate | null;
}

export interface KnowledgeArea {
  id: Id;
  unitId: Id;
  name: string;
  description: string;
  capabilityIds: Id[];
  criticality: Scale5;
  /** Genetableringstid i måneder, hvis viden skal opbygges fra bunden uden dokumentation. */
  baseRebuildMonths: number;
  documentation: Timeline<DocLevel>;
  holders: KnowledgeHolder[];
}

export interface ReadinessAssessment {
  date: ISODate;
  readiness: Readiness;
  basis: Basis;
  assessorRoleId: Id;
  evidenceIds: Id[];
}

export interface SuccessorCandidate {
  personId: Id;
  from: ISODate;
  to: ISODate | null;
  assessments: ReadinessAssessment[];
  developmentNeeds: string[];
}

export interface SuccessionPlan {
  id: Id;
  roleId: Id;
  ownerRoleId: Id;
  established: ISODate;
  /** Datoer for gennemførte reviews af planen. */
  reviews: ISODate[];
  candidates: SuccessorCandidate[];
}

export type EvidenceType =
  | 'udviklingsforløb'
  | 'uddelegeret-ansvar'
  | 'projektleverance'
  | 'certificering'
  | 'videnoverdragelse'
  | 'omstillingsforløb';

export interface Evidence {
  id: Id;
  type: EvidenceType;
  title: string;
  personId: Id | null;
  roleId: Id | null;
  capabilityId: Id | null;
  knowledgeId: Id | null;
  date: ISODate;
  endDate: ISODate | null;
  /** System eller rolle, der har registreret evidensen. */
  source: string;
}

export type AssessmentKind = 'fremtidig-betydning' | 'sandsynlighed';

/** Vurdering foretaget af en navngiven rolle på en given dato. */
export interface Assessment {
  id: Id;
  kind: AssessmentKind;
  subjectType: 'kapabilitet' | 'risiko';
  subjectId: Id;
  value: Scale5;
  date: ISODate;
  assessorRoleId: Id;
  basis: Basis;
  rationale: string;
}

export type PracticeCategory =
  | 'videndeling'
  | 'onboarding'
  | 'tværgående samarbejde'
  | 'beslutningsrutine'
  | 'læringsrutine'
  | 'arbejdspraksis';

export interface PracticeCarrier {
  personId: Id;
  from: ISODate;
  to: ISODate | null;
}

/** Kultur som organisatorisk praksis og infrastruktur. */
export interface CulturePractice {
  id: Id;
  name: string;
  description: string;
  category: PracticeCategory;
  unitIds: Id[];
  importance: Scale5;
  /** Dato hvor praksis blev registreret i praksisregistret. */
  registered: ISODate;
  /** Formel ejerrolle (null = ingen formel ejer). */
  ownerRoleId: Id | null;
  /** Praksis er beskrevet skriftligt. */
  documented: Timeline<boolean>;
  carriers: PracticeCarrier[];
  /** Andel af planlagte gennemførelser, der faktisk er afholdt (0–1), pr. kvartal. */
  adherence: Timeline<number>;
}

export type RiskCategory =
  | 'succession'
  | 'videnskoncentration'
  | 'kapacitetsgab'
  | 'kulturbærer';

export type RiskStatus = 'åben' | 'under behandling' | 'delvist afværget' | 'accepteret';

/** Ledelsens behandling af en beregnet risiko. Nøglen er risikoens id. */
export interface RiskTreatment {
  riskId: Id;
  /** Dato, hvor ledelsens behandling blev registreret (gælder fra denne dato). */
  registered: ISODate;
  status: RiskStatus;
  ownerRoleId: Id;
  followUp: ISODate;
  mitigations: string[];
  actionIds: Id[];
}

export type ActionStatus = 'planlagt' | 'igangsat' | 'gennemført' | 'forsinket';

export interface Action {
  id: Id;
  title: string;
  description: string;
  riskIds: Id[];
  ownerRoleId: Id;
  /** Dato, hvor handlingen blev besluttet (vises fra denne dato). */
  registered: ISODate;
  start: ISODate;
  due: ISODate;
  /** Status pr. datagrundlagets dato. Historisk status udledes af datoerne. */
  status: ActionStatus;
  /** Forventet effekt, udtrykt som scenarieændringer (beregnes med samme model). */
  expectedChanges: ScenarioChange[];
  /** Forklaring, når handlingens effekt ikke kan udtrykkes i modellen (fx bedre datadækning). */
  effectNote: string | null;
}

/** Scenarieændringer – anvendes på en kopi af data og ændrer aldrig grunddata. */
export type ScenarioChange =
  | { type: 'personUnavailable'; personId: Id; promoteReadySuccessor: boolean }
  | { type: 'successorReady'; roleId: Id; personId: Id; readiness: Readiness }
  | { type: 'knowledgeTransfer'; knowledgeId: Id; documentationLevel: DocLevel; addHolderId: Id | null }
  | { type: 'capabilityCapacity'; capabilityId: Id; requiredDeltaFte: number; currentDeltaFte: number }
  | { type: 'practiceAnchoring'; practiceId: Id; formalize: boolean; addCarrierIds: Id[] };

export interface Scenario {
  id: Id;
  name: string;
  description: string;
  changes: ScenarioChange[];
}

/** Hele datagrundlaget for én organisation. */
export interface Dataset {
  organization: Organization;
  units: BusinessUnit[];
  goals: StrategicGoal[];
  capabilities: Capability[];
  roles: Role[];
  persons: Person[];
  assignments: Assignment[];
  knowledge: KnowledgeArea[];
  successionPlans: SuccessionPlan[];
  evidence: Evidence[];
  assessments: Assessment[];
  practices: CulturePractice[];
  riskTreatments: RiskTreatment[];
  actions: Action[];
  /** Datoen data senest er opdateret (demonstrationens "i dag"). */
  dataAsOf: ISODate;
}
