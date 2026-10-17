/**
 * FIKTIVE DEMONSTRATIONSDATA – successionsplaner og dokumenteret evidens.
 *
 * Beredskab:
 *  - 'nu'   kan overtage rollen nu med normal introduktion
 *  - '1-2'  forventes klar inden for 1–2 år med planlagt udvikling
 *  - '3-5'  forventes klar inden for 3–5 år
 * Hver vurdering angiver, om den hviler på dokumenteret evidens eller på
 * menneskelig vurdering, hvem der har vurderet, og hvornår.
 */
import type { Evidence, ReadinessAssessment, SuccessionPlan, SuccessorCandidate } from '../../domain/types';

function ra(date: string, readiness: ReadinessAssessment['readiness'], basis: ReadinessAssessment['basis'], assessorRoleId: string, evidenceIds: string[] = []): ReadinessAssessment {
  return { date, readiness, basis, assessorRoleId, evidenceIds };
}

function cand(personId: string, from: string, assessments: ReadinessAssessment[], developmentNeeds: string[], to: string | null = null): SuccessorCandidate {
  return { personId, from, to, assessments, developmentNeeds };
}

export const successionPlans: SuccessionPlan[] = [
  {
    id: 'SP01', roleId: 'R01', ownerRoleId: 'R23', established: '2023-05-01', reviews: ['2025-05-20', '2026-05-18'],
    candidates: [
      cand('P03', '2023-05-01', [ra('2025-05-20', '1-2', 'vurdering', 'R23')], ['Kapitalmarkeds- og bestyrelseserfaring', 'Ansvar for kommerciel vækst']),
      cand('P04', '2023-05-01', [ra('2025-05-20', '3-5', 'vurdering', 'R23'), ra('2026-05-18', '1-2', 'vurdering', 'R23')], ['Driftsansvar for produktion', 'Bredere økonomisk ansvar']),
    ],
  },
  {
    id: 'SP02', roleId: 'R02', ownerRoleId: 'R01', established: '2023-03-01', reviews: ['2025-04-10', '2026-04-15'],
    candidates: [
      cand('P25', '2024-03-01', [ra('2025-04-10', '3-5', 'vurdering', 'R01'), ra('2026-04-15', '1-2', 'dokumenteret', 'R01', ['E10', 'E11'])], ['Finansiering og treasury', 'Ledelse af større afdeling']),
    ],
  },
  {
    id: 'SP03', roleId: 'R03', ownerRoleId: 'R01', established: '2022-09-01', reviews: ['2025-03-01', '2026-03-05'],
    candidates: [
      cand('P07', '2022-09-01', [ra('2025-03-01', 'nu', 'dokumenteret', 'R01', ['E01'])], ['Strategisk leverandørstyring']),
      cand('P10', '2024-03-01', [ra('2025-03-01', '1-2', 'vurdering', 'R01')], ['Ledelse af fabriksdrift', 'Ansvar for større investeringer']),
    ],
  },
  {
    id: 'SP04', roleId: 'R04', ownerRoleId: 'R01', established: '2023-01-15', reviews: ['2025-06-01', '2026-06-03'],
    candidates: [
      cand('P12', '2023-01-15', [ra('2025-06-01', '1-2', 'dokumenteret', 'R01', ['E15'])], ['Ansvar for serviceforretning', 'Nordisk markedskendskab']),
    ],
  },
  {
    id: 'SP05', roleId: 'R05', ownerRoleId: 'R01', established: '2022-11-01', reviews: ['2025-02-15', '2026-02-20'],
    candidates: [
      cand('P19', '2022-11-01', [ra('2025-02-15', '1-2', 'vurdering', 'R01'), ra('2026-02-20', '1-2', 'vurdering', 'R01')], ['Porteføljestyring på tværs af platforme', 'Direktionserfaring']),
    ],
  },
  {
    id: 'SP06', roleId: 'R06', ownerRoleId: 'R01', established: '2024-06-01', reviews: ['2025-11-10', '2026-03-01'],
    candidates: [
      cand('P19', '2025-11-10', [ra('2025-11-10', '1-2', 'vurdering', 'R01')], ['Kommerciel forretningsmodel for services', 'Ledelse af softwareorganisation']),
      cand('P18', '2026-03-01', [ra('2026-03-01', '3-5', 'vurdering', 'R01')], ['Personaleledelse', 'Resultatansvar', 'Kommerciel forhandling']),
    ],
  },
  {
    id: 'SP07', roleId: 'R07', ownerRoleId: 'R03', established: '2022-01-10', reviews: ['2025-01-20', '2026-06-10'],
    candidates: [
      cand('P29', '2022-01-10', [ra('2025-01-20', '1-2', 'dokumenteret', 'R03', ['E02']), ra('2026-06-10', 'nu', 'dokumenteret', 'R03', ['E02', 'E03'])], ['Budgetansvar for hele fabrikken']),
      cand('P10', '2024-01-20', [ra('2025-01-20', 'nu', 'vurdering', 'R03')], ['Erfaring med skiftledelse']),
    ],
  },
  {
    id: 'SP08', roleId: 'R08', ownerRoleId: 'R03', established: '2022-01-10', reviews: ['2025-01-20', '2026-01-22'],
    candidates: [cand('P29', '2022-01-10', [ra('2025-01-20', 'nu', 'dokumenteret', 'R03', ['E02'])], ['Facilitering af forbedringsprogrammer'])],
  },
  {
    id: 'SP09', roleId: 'R09', ownerRoleId: 'R03', established: '2023-04-01', reviews: ['2025-04-01', '2026-05-12'],
    candidates: [
      cand('P30', '2023-04-01', [ra('2025-04-01', '1-2', 'dokumenteret', 'R03', ['E04']), ra('2026-05-12', 'nu', 'dokumenteret', 'R03', ['E04', 'E05'])], ['Ledelse af indkøbsteam i flere lande']),
    ],
  },
  {
    id: 'SP10', roleId: 'R10', ownerRoleId: 'R03', established: '2023-04-01', reviews: ['2025-04-01', '2026-04-02'],
    candidates: [cand('P39', '2023-04-01', [ra('2025-04-01', 'nu', 'dokumenteret', 'R03', ['E06'])], ['Personaleledelse af planlæggere'])],
  },
  {
    id: 'SP11', roleId: 'R12', ownerRoleId: 'R04', established: '2024-08-15', reviews: ['2025-08-15', '2026-08-18'],
    candidates: [cand('P34', '2024-08-15', [ra('2025-08-15', '1-2', 'vurdering', 'R04')], ['Ledelse af salgsteam', 'Forhandling af rammeaftaler'])],
  },
  {
    id: 'SP12', roleId: 'R13', ownerRoleId: 'R04', established: '2025-03-01', reviews: ['2025-08-15', '2026-08-18'],
    candidates: [cand('P34', '2025-08-15', [ra('2025-08-15', 'nu', 'vurdering', 'R04')], ['Nordisk markedskendskab'])],
  },
  {
    id: 'SP13', roleId: 'R14', ownerRoleId: 'R04', established: '2025-09-01', reviews: ['2025-09-01', '2026-08-20'],
    candidates: [cand('P35', '2025-09-01', [ra('2025-09-01', '3-5', 'vurdering', 'R04'), ra('2026-08-20', '1-2', 'vurdering', 'R04')], ['Personaleledelse', 'Salg til direktionsniveau'])],
  },
  {
    id: 'SP14', roleId: 'R15', ownerRoleId: 'R06', established: '2025-10-01', reviews: ['2025-10-01', '2026-07-01'],
    candidates: [cand('P27', '2025-10-01', [ra('2025-10-01', '3-5', 'vurdering', 'R06'), ra('2026-07-01', '1-2', 'vurdering', 'R06')], ['Selvstændig kalibrering af produktionsmodeller', 'Personaleledelse', 'Dialog med kunder om modelrisiko'])],
  },
  {
    id: 'SP15', roleId: 'R16', ownerRoleId: 'R06', established: '2025-06-01', reviews: ['2025-06-01', '2026-06-15'],
    candidates: [cand('P32', '2025-06-01', [ra('2025-06-01', '3-5', 'vurdering', 'R06')], ['Arkitekturansvar for hele platformen', 'Sikkerheds- og driftsansvar'])],
  },
  {
    id: 'SP16', roleId: 'R17', ownerRoleId: 'R06', established: '2025-11-15', reviews: ['2025-11-15'],
    candidates: [],
  },
  {
    id: 'SP17', roleId: 'R19', ownerRoleId: 'R05', established: '2023-03-01', reviews: ['2025-03-10', '2026-03-12'],
    candidates: [
      cand('P22', '2023-03-01', [ra('2025-03-10', 'nu', 'vurdering', 'R05')], ['Hydraulisk domæneviden']),
      cand('P40', '2023-03-01', [ra('2025-03-10', '3-5', 'dokumenteret', 'R05', ['E20']), ra('2026-03-12', '1-2', 'dokumenteret', 'R05', ['E20', 'E21'])], ['Porteføljeprioritering', 'Personaleledelse af flere teams']),
    ],
  },
  {
    id: 'SP18', roleId: 'R20', ownerRoleId: 'R05', established: '2024-09-01', reviews: ['2025-09-05', '2026-03-01'],
    candidates: [cand('P33', '2026-03-01', [ra('2026-03-01', '3-5', 'dokumenteret', 'R05', ['E22'])], ['Selvstændig brug af simuleringsværktøjet', 'Empiriske designregler for store pumper', 'Faglig sparring med kunder'])],
  },
  {
    id: 'SP19', roleId: 'R21', ownerRoleId: 'R05', established: '2025-06-01', reviews: ['2025-06-01', '2026-08-25'],
    candidates: [cand('P36', '2025-06-01', [ra('2025-06-01', '3-5', 'dokumenteret', 'R05', ['E23']), ra('2026-08-25', '1-2', 'dokumenteret', 'R05', ['E23', 'E24'])], ['Selvstændig myndighedsdialog', 'Erfaring med flere produktfamilier'])],
  },
  {
    id: 'SP20', roleId: 'R22', ownerRoleId: 'R05', established: '2024-03-10', reviews: ['2025-03-10', '2026-03-12'],
    candidates: [cand('P40', '2024-03-10', [ra('2025-03-10', '1-2', 'dokumenteret', 'R05', ['E20'])], ['Personaleledelse'])],
  },
  {
    id: 'SP21', roleId: 'R23', ownerRoleId: 'R01', established: '2024-05-01', reviews: ['2025-05-01', '2026-05-04'],
    candidates: [cand('P37', '2024-05-01', [ra('2025-05-01', '1-2', 'vurdering', 'R01')], ['Direktionsrådgivning', 'Ansvar for organisationsudvikling'])],
  },
  {
    id: 'SP22', roleId: 'R24', ownerRoleId: 'R02', established: '2024-05-01', reviews: ['2025-05-01', '2026-05-06'],
    candidates: [cand('P38', '2024-05-01', [ra('2025-05-01', 'nu', 'dokumenteret', 'R02', ['E30'])], ['Leverandørstyring af IT-outsourcing'])],
  },
  {
    id: 'SP23', roleId: 'R25', ownerRoleId: 'R02', established: '2024-04-10', reviews: ['2025-04-10', '2026-04-15'],
    candidates: [cand('P28', '2024-04-10', [ra('2025-04-10', '1-2', 'vurdering', 'R02')], ['Prissætning af serviceaftaler', 'Kommerciel forhandling'])],
  },
];

function ev(
  id: string,
  type: Evidence['type'],
  title: string,
  refs: { personId?: string; roleId?: string; capabilityId?: string; knowledgeId?: string },
  date: string,
  endDate: string | null,
  source: string,
): Evidence {
  return {
    id,
    type,
    title,
    personId: refs.personId ?? null,
    roleId: refs.roleId ?? null,
    capabilityId: refs.capabilityId ?? null,
    knowledgeId: refs.knowledgeId ?? null,
    date,
    endDate,
    source,
  };
}

const HR = 'HR-system: udviklingsforløb';
const KONST = 'HR-system: konstitueringer og delegationer';

export const evidence: Evidence[] = [
  ev('E01', 'uddelegeret-ansvar', 'Konstitueret driftsdirektør under orlov', { personId: 'P07', roleId: 'R03' }, '2024-08-01', '2024-11-30', KONST),
  ev('E02', 'udviklingsforløb', 'Lederudviklingsprogram, niveau 2', { personId: 'P29' }, '2025-02-01', '2025-11-30', HR),
  ev('E03', 'uddelegeret-ansvar', 'Ansvar for andet skift og MES-implementering', { personId: 'P29', roleId: 'R07' }, '2026-01-15', null, KONST),
  ev('E04', 'udviklingsforløb', 'Indkøbsakademi: forhandling og risikostyring', { personId: 'P30' }, '2025-03-01', '2025-12-15', HR),
  ev('E05', 'uddelegeret-ansvar', 'Forhandlingsansvar for leverandørkonsolidering', { personId: 'P30', roleId: 'R09' }, '2025-11-01', '2026-09-26', KONST),
  ev('E06', 'uddelegeret-ansvar', 'Fungerende planlægningschef i ferieperioder', { personId: 'P39', roleId: 'R10' }, '2025-07-01', '2025-08-31', KONST),
  ev('E07', 'udviklingsforløb', 'Lederudviklingsprogram, niveau 3', { personId: 'P10' }, '2025-09-01', '2026-06-30', HR),
  ev('E08', 'uddelegeret-ansvar', 'Ansvar for salgs- og driftsplanlægning (S&OP)', { personId: 'P10', roleId: 'R03' }, '2026-02-01', null, KONST),
  ev('E10', 'projektleverance', 'Prisrammeværk for serviceaftaler godkendt af direktionen', { personId: 'P25', capabilityId: 'C09' }, '2026-03-31', null, 'Direktionsreferat'),
  ev('E11', 'udviklingsforløb', 'Executive-program i finansiel ledelse', { personId: 'P25' }, '2025-09-01', '2026-06-30', HR),
  ev('E12', 'udviklingsforløb', 'Controllerakademi', { personId: 'P28' }, '2026-01-10', null, HR),
  ev('E13', 'uddelegeret-ansvar', 'Projektleder for ny lønmodel', { personId: 'P37', roleId: 'R23' }, '2025-10-01', '2026-04-30', KONST),
  ev('E14', 'uddelegeret-ansvar', 'Ansvar for tre nye key accounts i Tyskland', { personId: 'P34', roleId: 'R12', capabilityId: 'C08' }, '2025-10-01', '2026-03-20', KONST),
  ev('E15', 'udviklingsforløb', 'Executive-program i kommerciel ledelse', { personId: 'P12' }, '2024-09-01', '2025-05-31', HR),
  ev('E16', 'udviklingsforløb', 'Konsultativt salg af serviceaftaler', { personId: 'P35', capabilityId: 'C03' }, '2026-02-01', '2026-06-30', HR),
  ev('E17', 'udviklingsforløb', 'Mentorforløb med leder af Data Science', { personId: 'P27', capabilityId: 'C01' }, '2025-10-01', null, HR),
  ev('E18', 'omstillingsforløb', 'Produktledelse for dataprodukter', { personId: 'P18', capabilityId: 'C01' }, '2025-06-01', '2025-12-31', HR),
  ev('E20', 'udviklingsforløb', 'Teknisk lederprogram', { personId: 'P40' }, '2025-01-15', '2025-10-31', HR),
  ev('E21', 'uddelegeret-ansvar', 'Projektleder for Nova-styringsenhed', { personId: 'P40', roleId: 'R19' }, '2025-11-01', null, KONST),
  ev('E22', 'udviklingsforløb', 'Mesterlære i hydraulisk simulering', { personId: 'P33', knowledgeId: 'K03' }, '2026-03-01', null, HR),
  ev('E23', 'certificering', 'ATEX-kompetencebevis', { personId: 'P36', capabilityId: 'C05' }, '2025-05-20', null, 'Kvalitetssystem: certifikater'),
  ev('E24', 'uddelegeret-ansvar', 'Ansvar for ATEX-dossier for Nova', { personId: 'P36', roleId: 'R21', knowledgeId: 'K04' }, '2026-02-01', '2026-08-14', KONST),
  ev('E26', 'videnoverdragelse', 'Dossierskabelon og testprotokoller beskrevet', { personId: 'P21', knowledgeId: 'K04' }, '2026-06-20', null, 'Kvalitetssystem'),
  ev('E27', 'videnoverdragelse', 'Beredskabsplaner for kritiske leverandører dokumenteret', { personId: 'P09', knowledgeId: 'K07' }, '2026-03-10', null, 'Kvalitetssystem'),
  ev('E28', 'videnoverdragelse', 'Kalibreringsprocessen delvist dokumenteret', { personId: 'P15', knowledgeId: 'K01' }, '2026-05-15', null, 'Wiki, Digitale Services'),
  ev('E29', 'videnoverdragelse', 'Arkitekturbeskrivelse opdateret efter platformskifte', { personId: 'P16', knowledgeId: 'K02' }, '2026-08-15', null, 'Arkitekturregister'),
  ev('E30', 'uddelegeret-ansvar', 'Ansvar for cloudmigrering af ERP', { personId: 'P38', roleId: 'R24' }, '2025-08-01', '2026-06-30', KONST),
  ev('E31', 'omstillingsforløb', 'Certificering i cloudarkitektur', { personId: 'P32', capabilityId: 'C02' }, '2026-04-01', null, HR),
  ev('E32', 'omstillingsforløb', 'Omskoling fra procesanalyse til datavidenskab', { personId: 'P39', capabilityId: 'C01' }, '2026-05-01', null, HR),
];
