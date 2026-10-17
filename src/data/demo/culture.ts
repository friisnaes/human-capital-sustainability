/**
 * FIKTIVE DEMONSTRATIONSDATA – praksisregister (kultur som infrastruktur).
 *
 * Datagrundlaget er praksisregistret: hvilke rutiner findes, hvem ejer og
 * bærer dem, er de beskrevet, og hvor ofte gennemføres de som planlagt
 * (opgjort fra mødekalendere på aggregeret niveau). Der analyseres ikke
 * mødeindhold, beskeder eller enkeltpersoners adfærd.
 *
 * Registret blev etableret 1. februar 2026. Før denne dato findes ingen
 * praksisdata, og dimensionen kulturel kontinuitet kan ikke beregnes.
 * Koncernfunktioner har endnu ikke registreret praksisser.
 */
import type { CulturePractice } from '../../domain/types';

const REG = '2026-02-01';

function adh(q1: number, q2: number, q3: number) {
  return [
    { date: '2026-03-31', value: q1 },
    { date: '2026-06-30', value: q2 },
    { date: '2026-09-30', value: q3 },
  ];
}

export const practices: CulturePractice[] = [
  {
    id: 'CP01', name: 'Daglig tavlestyring i produktionen', category: 'beslutningsrutine', unitIds: ['PRD'], importance: 4,
    description: 'Korte daglige møder ved tavlen med faste beslutningsrettigheder og eskalering.',
    registered: REG, ownerRoleId: 'R07', documented: [{ date: REG, value: true }],
    carriers: [
      { personId: 'P07', from: '2016-04-01', to: null },
      { personId: 'P29', from: '2019-01-01', to: null },
      { personId: 'P08', from: '2018-01-15', to: null },
    ],
    adherence: adh(0.96, 0.95, 0.97),
  },
  {
    id: 'CP02', name: 'Struktureret onboarding til nøgleroller', category: 'onboarding', unitIds: ['PRD', 'KOM', 'DIG', 'TEK'], importance: 4,
    description: 'Fast 90-dages program med mentor, introduktion til beslutningsfora og overdragelse fra forgænger.',
    registered: REG, ownerRoleId: 'R23', documented: [{ date: REG, value: true }],
    carriers: [
      { personId: 'P23', from: '2022-01-01', to: null },
      { personId: 'P37', from: '2022-01-01', to: null },
    ],
    adherence: adh(0.75, 0.8, 0.85),
  },
  {
    id: 'CP03', name: 'Teknisk designreview', category: 'læringsrutine', unitIds: ['TEK'], importance: 5,
    description: 'Gennemgang af alle nye hydrauliske design før prototype. Drives i praksis af én seniorspecialist.',
    registered: REG, ownerRoleId: null, documented: [{ date: REG, value: false }],
    carriers: [{ personId: 'P20', from: '2010-01-01', to: null }],
    adherence: adh(0.7, 0.65, 0.7),
  },
  {
    id: 'CP04', name: 'Kundeindsigtsforum på tværs af salg og service', category: 'tværgående samarbejde', unitIds: ['KOM', 'DIG'], importance: 4,
    description: 'Månedligt forum, hvor salg, kundesucces og data science gennemgår kundernes driftsdata og fornyelser.',
    registered: REG, ownerRoleId: 'R04', documented: [{ date: REG, value: true }],
    carriers: [
      { personId: 'P14', from: '2025-03-01', to: null },
      { personId: 'P17', from: '2025-11-01', to: null },
    ],
    adherence: adh(0.55, 0.6, 0.65),
  },
  {
    id: 'CP05', name: 'Modelreview i Data Science', category: 'videndeling', unitIds: ['DIG'], importance: 4,
    description: 'Ugentlig gennemgang af modelændringer og kalibrering. Afholdes kun, når lederen af Data Science deltager.',
    registered: REG, ownerRoleId: null, documented: [{ date: REG, value: false }],
    carriers: [{ personId: 'P15', from: '2021-06-01', to: null }],
    adherence: adh(0.6, 0.55, 0.6),
  },
  {
    id: 'CP06', name: 'Forbedringstavler og kaizen-uger', category: 'arbejdspraksis', unitIds: ['PRD'], importance: 3,
    description: 'Synlige forbedringsforslag, ugentlig opfølgning og to årlige forbedringsuger.',
    registered: REG, ownerRoleId: 'R08', documented: [{ date: REG, value: true }],
    carriers: [
      { personId: 'P08', from: '2018-01-15', to: null },
      { personId: 'P29', from: '2019-01-01', to: null },
      { personId: 'P10', from: '2020-01-01', to: null },
    ],
    adherence: adh(0.9, 0.92, 0.9),
  },
  {
    id: 'CP07', name: 'Kvartalsvis strategiopfølgning på tværs', category: 'beslutningsrutine', unitIds: ['PRD', 'KOM', 'DIG', 'TEK'], importance: 5,
    description: 'Fælles gennemgang af strategiske mål, milepæle og ressourcebehov med enhedsledere.',
    registered: REG, ownerRoleId: 'R26',
    documented: [
      { date: REG, value: false },
      { date: '2026-05-15', value: true },
    ],
    carriers: [
      { personId: 'P26', from: '2024-09-01', to: null },
      { personId: 'P01', from: '2024-09-01', to: null },
    ],
    adherence: adh(1, 1, 1),
  },
  {
    id: 'CP08', name: 'Læringsreview efter kundeprojekter', category: 'læringsrutine', unitIds: ['KOM'], importance: 3,
    description: 'Struktureret evaluering efter større leverancer, så erfaringer føres videre til næste tilbud.',
    registered: REG, ownerRoleId: null, documented: [{ date: REG, value: false }],
    carriers: [
      { personId: 'P12', from: '2022-01-01', to: null },
      { personId: 'P34', from: '2023-01-01', to: null },
    ],
    adherence: adh(0.5, 0.45, 0.5),
  },
  {
    id: 'CP09', name: 'Mesterlære i hydraulisk simulering', category: 'videndeling', unitIds: ['TEK'], importance: 5,
    description: 'Parvis arbejde på rigtige designopgaver, så erfaring overføres fra seniorspecialist til yngre ingeniører.',
    registered: REG, ownerRoleId: null, documented: [{ date: REG, value: false }],
    carriers: [{ personId: 'P20', from: '2026-03-01', to: null }],
    adherence: adh(0.8, 0.75, 0.8),
  },
];
