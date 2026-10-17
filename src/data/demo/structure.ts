/**
 * FIKTIVE DEMONSTRATIONSDATA.
 * Halbjerg Flowteknik A/S er en opdigtet virksomhed. Enhver lighed med
 * eksisterende virksomheder eller personer er tilfældig.
 */
import type { BusinessUnit, Capability, Organization, Role, StrategicGoal } from '../../domain/types';

export const organization: Organization = {
  id: 'ORG1',
  name: 'Halbjerg Flowteknik A/S',
  industry: 'Industrielle pumpe- og flowsystemer',
  employees: 1380,
  strategyName: 'Kurs 2029',
  description:
    'Fiktiv dansk industrivirksomhed med stærk produktion og leveringsevne. Strategien Kurs 2029 flytter vækst mod digitale serviceaftaler og en ny pumpeplatform, hvor viden og ledelse er koncentreret hos få personer.',
  fictional: true,
};

export const units: BusinessUnit[] = [
  {
    id: 'PRD',
    orgId: 'ORG1',
    name: 'Produktion & Forsyning',
    shortName: 'Produktion',
    description: 'Fabrik, kvalitet, indkøb og planlægning. Moden drift med stabile rutiner.',
    growthCritical: false,
  },
  {
    id: 'KOM',
    orgId: 'ORG1',
    name: 'Kommerciel',
    shortName: 'Kommerciel',
    description: 'Salg, key accounts i DACH og Norden samt salg af serviceaftaler.',
    growthCritical: true,
  },
  {
    id: 'DIG',
    orgId: 'ORG1',
    name: 'Digitale Services',
    shortName: 'Digitale Services',
    description: 'Serviceplatform, prediktiv vedligeholdelse og kundesucces. Strategiens vækstmotor.',
    growthCritical: true,
  },
  {
    id: 'TEK',
    orgId: 'ORG1',
    name: 'Teknologi & Produktudvikling',
    shortName: 'Teknologi',
    description: 'Hydraulisk design, embedded software og certificering af nye produkter.',
    growthCritical: true,
  },
  {
    id: 'KON',
    orgId: 'ORG1',
    name: 'Koncernfunktioner',
    shortName: 'Koncern',
    description: 'Direktion, økonomi, HR, IT samt strategi og transformation.',
    growthCritical: false,
  },
];

export const goals: StrategicGoal[] = [
  {
    id: 'M1',
    code: 'M1',
    title: 'Digitale serviceaftaler udgør 25 % af omsætningen',
    description: 'Abonnementsbaserede serviceaftaler med prediktiv vedligeholdelse skal udgøre en fjerdedel af omsætningen.',
    deadline: '2029-12-31',
    ownerRoleId: 'R06',
    milestones: [
      { id: 'M1-1', title: 'Serviceplatform v2 i drift', planned: '2025-11-30', completed: '2026-02-15' },
      { id: 'M1-2', title: '100 kunder på serviceabonnement', planned: '2026-06-30', completed: null },
      { id: 'M1-3', title: 'Prediktiv vedligeholdelse lanceret i DACH', planned: '2027-03-31', completed: null },
    ],
  },
  {
    id: 'M2',
    code: 'M2',
    title: 'Pumpeplatformen Nova lanceres i 2027',
    description: 'Ny generation energieffektive pumper med indbygget sensorik og ATEX-godkendelse.',
    deadline: '2027-06-30',
    ownerRoleId: 'R05',
    milestones: [
      { id: 'M2-1', title: 'Prototype godkendt', planned: '2025-10-31', completed: '2025-10-28' },
      { id: 'M2-2', title: 'ATEX-certificering af Nova', planned: '2026-05-31', completed: '2026-08-14' },
      { id: 'M2-3', title: 'Pilotproduktion', planned: '2026-12-15', completed: null },
      { id: 'M2-4', title: 'Kommerciel lancering', planned: '2027-06-30', completed: null },
    ],
  },
  {
    id: 'M3',
    code: 'M3',
    title: 'Vækst på 30 % i DACH og Norden',
    description: 'Flere key accounts i Tyskland, Østrig og Schweiz samt rammeaftaler med nordiske forsyninger.',
    deadline: '2028-12-31',
    ownerRoleId: 'R04',
    milestones: [
      { id: 'M3-1', title: 'Tre nye key accounts i Tyskland', planned: '2026-03-31', completed: '2026-03-20' },
      { id: 'M3-2', title: 'Salgskontor i Oslo åbnet', planned: '2026-09-01', completed: '2026-08-25' },
      { id: 'M3-3', title: 'Rammeaftaler med to nordiske forsyninger', planned: '2027-03-31', completed: null },
    ],
  },
  {
    id: 'M4',
    code: 'M4',
    title: 'Leveringspræcision på mindst 97 %',
    description: 'Fastholde leveringsevne og produktivitet, mens kapacitet flyttes mod vækstområderne.',
    deadline: '2027-12-31',
    ownerRoleId: 'R03',
    milestones: [
      { id: 'M4-1', title: 'Lean-program fase 2', planned: '2025-12-31', completed: '2025-12-18' },
      { id: 'M4-2', title: 'Nyt MES-system i drift', planned: '2026-04-30', completed: '2026-04-28' },
      { id: 'M4-3', title: 'Leverandørkonsolidering', planned: '2026-09-30', completed: '2026-09-26' },
      { id: 'M4-4', title: 'Automatiseret slutkontrol', planned: '2027-06-30', completed: null },
    ],
  },
];

/** Kapacitetsdatoer (kvartalsvise opgørelser fra ressourceplanen). */
const Q = ['2024-09-30', '2025-03-31', '2025-09-30', '2025-12-31', '2026-03-31', '2026-06-30', '2026-09-30'] as const;

function cap(required: number[], current: number[]) {
  return Q.map((date, i) => ({ date, value: { required: required[i] ?? 0, current: current[i] ?? 0 } }));
}

const RESSOURCEPLAN = 'Ressourceplan (økonomi), kvartalsvis';

export const capabilities: Capability[] = [
  {
    id: 'C01',
    unitId: 'DIG',
    name: 'Prediktiv analyse og datavidenskab',
    description: 'Modeller, der forudsiger nedbrud og optimerer service ud fra sensordata.',
    goalIds: ['M1'],
    capacity: cap([6, 7, 8, 8, 8, 10, 10], [2, 2.5, 3, 3, 3.5, 4, 4.5]),
    capacitySource: RESSOURCEPLAN,
  },
  {
    id: 'C02',
    unitId: 'DIG',
    name: 'IoT- og cloudplatform',
    description: 'Serviceplatformens arkitektur, integrationer og drift.',
    goalIds: ['M1', 'M2'],
    capacity: cap([9, 9, 10, 10, 10, 11, 11], [6, 6.5, 7, 7, 5.5, 6.5, 7.5]),
    capacitySource: RESSOURCEPLAN,
  },
  {
    id: 'C03',
    unitId: 'KOM',
    name: 'Salg af serviceaftaler',
    description: 'Rådgivende salg af abonnementer og serviceaftaler til eksisterende kunder.',
    goalIds: ['M1', 'M3'],
    capacity: cap([4, 5, 6, 6, 6, 6, 6], [2, 2.5, 3, 3.5, 4, 4.5, 5]),
    capacitySource: RESSOURCEPLAN,
  },
  {
    id: 'C04',
    unitId: 'TEK',
    name: 'Hydraulisk design og simulering',
    description: 'Konstruktion og simulering af pumpehydraulik til Nova-platformen.',
    goalIds: ['M2'],
    capacity: cap([7, 7, 7, 7, 7, 7, 7], [5, 5, 5, 5, 5, 5, 5.5]),
    capacitySource: RESSOURCEPLAN,
  },
  {
    id: 'C05',
    unitId: 'TEK',
    name: 'Certificering og produktgodkendelse',
    description: 'ATEX- og CE-dossierer, testplaner og myndighedsdialog.',
    goalIds: ['M2'],
    capacity: cap([3, 3, 3, 3, 3, 3, 3], [2, 2, 2, 2, 2.5, 2.5, 2.5]),
    capacitySource: RESSOURCEPLAN,
  },
  {
    id: 'C06',
    unitId: 'PRD',
    name: 'Lean-produktion og procesforbedring',
    description: 'Produktionssystem, standardiseret arbejde og løbende forbedring.',
    goalIds: ['M4'],
    capacity: cap([12, 12, 12, 12, 12, 12, 12], [11.5, 12, 12, 12, 12, 12, 12]),
    capacitySource: RESSOURCEPLAN,
  },
  {
    id: 'C07',
    unitId: 'PRD',
    name: 'Strategisk indkøb og leverandørstyring',
    description: 'Aftaler og forsyningssikkerhed for kritiske komponenter.',
    goalIds: ['M4', 'M2'],
    capacity: cap([6, 6, 6, 6, 6, 6, 6], [5.5, 6, 6, 6, 6, 6, 6]),
    capacitySource: RESSOURCEPLAN,
  },
  {
    id: 'C08',
    unitId: 'KOM',
    name: 'Key account management i DACH',
    description: 'Langvarige relationer til store industrikunder i Tyskland, Østrig og Schweiz.',
    goalIds: ['M3'],
    capacity: cap([4, 4, 5, 5, 5, 5, 5], [3, 3.5, 4, 4, 4.5, 4.5, 5]),
    capacitySource: RESSOURCEPLAN,
  },
  {
    id: 'C09',
    unitId: 'KON',
    name: 'Prissætning og kommerciel økonomi',
    description: 'Prismodeller for serviceaftaler og lønsomhedsstyring.',
    goalIds: ['M1', 'M3'],
    capacity: cap([2, 2, 3, 3, 3, 3, 3], [2, 2, 2, 2, 2, 2, 2.5]),
    capacitySource: RESSOURCEPLAN,
  },
  {
    id: 'C10',
    unitId: 'KON',
    name: 'Forandringsledelse og integration',
    description: 'Evnen til at gennemføre organisatoriske omstillinger på tværs af enheder.',
    goalIds: ['M1', 'M2', 'M3', 'M4'],
    capacity: cap([2, 2, 3, 3, 3, 3, 3], [1, 1.5, 2, 2, 2, 2, 2]),
    capacitySource: RESSOURCEPLAN,
  },
];

export const roles: Role[] = [
  // Direktion
  { id: 'R01', unitId: 'KON', title: 'Administrerende direktør', kind: 'direktion', leadership: true, criticality: 5, capabilityIds: ['C10'], recruitMonths: 6, rampUpMonths: 6 },
  { id: 'R02', unitId: 'KON', title: 'Økonomidirektør', kind: 'direktion', leadership: true, criticality: 4, capabilityIds: ['C09'], recruitMonths: 5, rampUpMonths: 4 },
  { id: 'R03', unitId: 'PRD', title: 'Driftsdirektør', kind: 'direktion', leadership: true, criticality: 4, capabilityIds: ['C06', 'C07'], recruitMonths: 5, rampUpMonths: 5 },
  { id: 'R04', unitId: 'KOM', title: 'Kommerciel direktør', kind: 'direktion', leadership: true, criticality: 4, capabilityIds: ['C03', 'C08'], recruitMonths: 5, rampUpMonths: 5 },
  { id: 'R05', unitId: 'TEK', title: 'Teknologidirektør', kind: 'direktion', leadership: true, criticality: 5, capabilityIds: ['C04', 'C05'], recruitMonths: 6, rampUpMonths: 8 },
  { id: 'R06', unitId: 'DIG', title: 'Direktør, Digitale Services', kind: 'direktion', leadership: true, criticality: 5, capabilityIds: ['C01', 'C02', 'C03'], recruitMonths: 7, rampUpMonths: 6 },
  // Produktion & Forsyning
  { id: 'R07', unitId: 'PRD', title: 'Fabrikschef', kind: 'leder', leadership: true, criticality: 4, capabilityIds: ['C06'], recruitMonths: 4, rampUpMonths: 4 },
  { id: 'R08', unitId: 'PRD', title: 'Leder, Lean og procesforbedring', kind: 'leder', leadership: true, criticality: 3, capabilityIds: ['C06'], recruitMonths: 4, rampUpMonths: 3 },
  { id: 'R09', unitId: 'PRD', title: 'Indkøbschef', kind: 'leder', leadership: true, criticality: 4, capabilityIds: ['C07'], recruitMonths: 4, rampUpMonths: 5 },
  { id: 'R10', unitId: 'PRD', title: 'Chef for forsyningsplanlægning', kind: 'leder', leadership: true, criticality: 3, capabilityIds: ['C07'], recruitMonths: 3, rampUpMonths: 3 },
  { id: 'R11', unitId: 'PRD', title: 'Kvalitetschef', kind: 'leder', leadership: true, criticality: 3, capabilityIds: ['C06'], recruitMonths: 4, rampUpMonths: 3 },
  // Kommerciel
  { id: 'R12', unitId: 'KOM', title: 'Salgsdirektør, DACH', kind: 'leder', leadership: true, criticality: 4, capabilityIds: ['C08'], recruitMonths: 6, rampUpMonths: 6 },
  { id: 'R13', unitId: 'KOM', title: 'Key account-chef, Norden', kind: 'leder', leadership: true, criticality: 3, capabilityIds: ['C08'], recruitMonths: 4, rampUpMonths: 4 },
  { id: 'R14', unitId: 'KOM', title: 'Leder, salg af serviceaftaler', kind: 'leder', leadership: true, criticality: 4, capabilityIds: ['C03'], recruitMonths: 4, rampUpMonths: 4 },
  // Digitale Services
  { id: 'R15', unitId: 'DIG', title: 'Leder, Data Science', kind: 'leder', leadership: true, criticality: 5, capabilityIds: ['C01'], recruitMonths: 7, rampUpMonths: 6 },
  { id: 'R16', unitId: 'DIG', title: 'Lead platformarkitekt', kind: 'nøglespecialist', leadership: false, criticality: 5, capabilityIds: ['C02'], recruitMonths: 6, rampUpMonths: 5 },
  { id: 'R17', unitId: 'DIG', title: 'Leder, kundesucces og drift', kind: 'leder', leadership: true, criticality: 3, capabilityIds: ['C03'], recruitMonths: 3, rampUpMonths: 3 },
  { id: 'R18', unitId: 'DIG', title: 'Produktejer, serviceplatform', kind: 'nøglespecialist', leadership: false, criticality: 4, capabilityIds: ['C01', 'C02'], recruitMonths: 4, rampUpMonths: 4 },
  // Teknologi & Produktudvikling
  { id: 'R19', unitId: 'TEK', title: 'Chef for produktudvikling', kind: 'leder', leadership: true, criticality: 4, capabilityIds: ['C04'], recruitMonths: 5, rampUpMonths: 5 },
  { id: 'R20', unitId: 'TEK', title: 'Seniorspecialist, hydraulisk simulering', kind: 'nøglespecialist', leadership: false, criticality: 5, capabilityIds: ['C04'], recruitMonths: 8, rampUpMonths: 10 },
  { id: 'R21', unitId: 'TEK', title: 'Certificeringsansvarlig', kind: 'nøglespecialist', leadership: false, criticality: 4, capabilityIds: ['C05'], recruitMonths: 5, rampUpMonths: 6 },
  { id: 'R22', unitId: 'TEK', title: 'Leder, embedded software', kind: 'leder', leadership: true, criticality: 3, capabilityIds: ['C04'], recruitMonths: 4, rampUpMonths: 4 },
  // Koncernfunktioner
  { id: 'R23', unitId: 'KON', title: 'HR-direktør', kind: 'leder', leadership: true, criticality: 3, capabilityIds: ['C10'], recruitMonths: 4, rampUpMonths: 3 },
  { id: 'R24', unitId: 'KON', title: 'IT-chef', kind: 'leder', leadership: true, criticality: 3, capabilityIds: ['C10'], recruitMonths: 4, rampUpMonths: 3 },
  { id: 'R25', unitId: 'KON', title: 'Chef for prissætning og controlling', kind: 'leder', leadership: true, criticality: 4, capabilityIds: ['C09'], recruitMonths: 4, rampUpMonths: 5 },
  { id: 'R26', unitId: 'KON', title: 'Leder, strategi og transformation', kind: 'leder', leadership: true, criticality: 3, capabilityIds: ['C10'], recruitMonths: 4, rampUpMonths: 3 },
];
