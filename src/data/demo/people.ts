/**
 * FIKTIVE DEMONSTRATIONSDATA – alle navne er opdigtede.
 * Personregistret indeholder bevidst kun det minimum, platformen behøver:
 * navn, enhed, stillingsbetegnelse og ansættelsesperiode. Der registreres
 * ingen alder, helbred, private forhold eller andre personlige karakteristika.
 */
import type { Assignment, Person } from '../../domain/types';

function p(id: string, name: string, unitId: string, title: string, employedFrom: string, employedTo: string | null = null): Person {
  return { id, name, unitId, title, employedFrom, employedTo };
}

export const persons: Person[] = [
  p('P01', 'Mette Kjærgaard', 'KON', 'Administrerende direktør', '2019-03-01'),
  p('P02', 'Henrik Vang', 'KON', 'Økonomidirektør', '2017-01-01'),
  p('P03', 'Lars Østergaard', 'PRD', 'Driftsdirektør', '2015-05-01'),
  p('P04', 'Camilla Juhl', 'KOM', 'Kommerciel direktør', '2021-02-01'),
  p('P05', 'Peter Albrechtsen', 'TEK', 'Teknologidirektør', '2012-08-01'),
  p('P06', 'Nadia Rasmussen', 'DIG', 'Direktør, Digitale Services', '2022-08-01'),
  p('P07', 'Torben Lind', 'PRD', 'Fabrikschef', '2016-04-01'),
  p('P08', 'Rikke Dam', 'PRD', 'Leder, Lean og procesforbedring', '2018-01-15'),
  p('P09', 'Morten Bach', 'PRD', 'Indkøbschef', '2014-09-01'),
  p('P10', 'Line Mørk', 'PRD', 'Chef for forsyningsplanlægning', '2019-06-01'),
  p('P11', 'Anders Krogh', 'PRD', 'Kvalitetschef', '2020-03-01'),
  p('P12', 'Katrin Weber', 'KOM', 'Salgsdirektør, DACH', '2020-01-01'),
  p('P13', 'Emil Berg', 'KOM', 'Key account-chef, Norden', '2021-09-01'),
  p('P14', 'Signe Holt', 'KOM', 'Leder, salg af serviceaftaler', '2025-01-15'),
  p('P15', 'Jakob Thorsen', 'DIG', 'Leder, Data Science', '2021-05-01'),
  p('P16', 'Maria Lykke', 'DIG', 'Lead platformarkitekt', '2026-04-01'),
  p('P17', 'Ditte Vestergaard', 'DIG', 'Leder, kundesucces og drift', '2022-03-01'),
  p('P18', 'Sofie Brandt', 'DIG', 'Produktejer, serviceplatform', '2023-09-01'),
  p('P19', 'Jonas Holm', 'TEK', 'Chef for produktudvikling', '2017-02-01'),
  p('P20', 'Bent Hjorth', 'TEK', 'Seniorspecialist, hydraulisk simulering', '2004-03-01'),
  p('P21', 'Hanne Skov', 'TEK', 'Certificeringsansvarlig', '2015-10-01'),
  p('P22', 'Mads Winther', 'TEK', 'Leder, embedded software', '2020-08-01'),
  p('P23', 'Louise Bang', 'KON', 'HR-direktør', '2018-04-01'),
  p('P24', 'Rasmus Kofoed', 'KON', 'IT-chef', '2019-01-01'),
  p('P25', 'Julie Frost', 'KON', 'Chef for prissætning og controlling', '2022-05-01'),
  p('P26', 'Nikolaj Due', 'KON', 'Leder, strategi og transformation', '2024-09-01'),
  p('P27', 'Amir Haddad', 'DIG', 'Senior data scientist', '2023-02-01'),
  p('P28', 'Freja Lund', 'KON', 'Senior controller', '2021-08-01'),
  p('P29', 'Oliver Sand', 'PRD', 'Produktionsleder', '2017-06-01'),
  p('P30', 'Caroline Ebbesen', 'PRD', 'Indkøbsleder', '2018-11-01'),
  p('P31', 'Ole Nygaard', 'DIG', 'Lead platformarkitekt (fratrådt)', '2019-02-01', '2026-01-31'),
  p('P32', 'Simon Krag', 'DIG', 'Senior cloududvikler', '2023-03-01'),
  p('P33', 'Ida Mortensen', 'TEK', 'Simuleringsingeniør', '2024-02-01'),
  p('P34', 'Kristian Bager', 'KOM', 'Key account manager, Tyskland', '2019-04-01'),
  p('P35', 'Laura Engel', 'KOM', 'Servicesalgskonsulent', '2022-10-01'),
  p('P36', 'Viktor Dahl', 'TEK', 'Kvalitets- og testingeniør', '2021-01-01'),
  p('P37', 'Maja Thygesen', 'KON', 'HR-partner', '2020-09-01'),
  p('P38', 'Frederik Kjær', 'KON', 'Infrastrukturansvarlig, IT', '2018-02-01'),
  p('P39', 'Anna Sejer', 'PRD', 'Leder, forsyningsanalyse', '2020-05-01'),
  p('P40', 'Christian Mølgaard', 'TEK', 'Senior systemingeniør', '2016-11-01'),
  p('P41', 'Poul Iversen', 'KOM', 'Key account-chef, Norden (fratrådt)', '2010-01-01', '2025-02-28'),
  p('P42', 'Ulla Sommer', 'DIG', 'Leder, kundesucces (fratrådt)', '2018-05-01', '2025-10-31'),
];

let seq = 0;
function a(
  roleId: string,
  personId: string,
  start: string,
  end: string | null,
  source: 'intern' | 'ekstern',
  onboarding: Assignment['onboarding'] = null,
): Assignment {
  seq += 1;
  return { id: `A${String(seq).padStart(2, '0')}`, roleId, personId, start, end, source, onboarding };
}

export const assignments: Assignment[] = [
  a('R01', 'P01', '2019-03-01', null, 'ekstern'),
  a('R02', 'P02', '2017-01-01', null, 'ekstern'),
  a('R03', 'P03', '2015-05-01', null, 'ekstern'),
  a('R04', 'P04', '2021-02-01', null, 'ekstern'),
  a('R05', 'P05', '2016-01-01', null, 'intern'),
  a('R06', 'P06', '2022-08-01', null, 'ekstern'),
  a('R07', 'P07', '2016-04-01', null, 'intern'),
  a('R08', 'P08', '2018-01-15', null, 'ekstern'),
  a('R09', 'P09', '2014-09-01', null, 'ekstern'),
  a('R10', 'P10', '2019-06-01', null, 'intern'),
  a('R11', 'P11', '2020-03-01', null, 'ekstern'),
  a('R12', 'P12', '2020-01-01', null, 'ekstern'),
  a('R13', 'P41', '2016-01-01', '2025-02-28', 'intern'),
  a('R13', 'P13', '2025-03-01', null, 'intern', 'struktureret'),
  a('R14', 'P14', '2025-01-15', null, 'ekstern', 'delvis'),
  a('R15', 'P15', '2021-05-01', null, 'ekstern'),
  a('R16', 'P31', '2019-02-01', '2026-01-31', 'ekstern'),
  a('R16', 'P16', '2026-04-01', null, 'ekstern', 'struktureret'),
  a('R17', 'P42', '2018-05-01', '2025-10-31', 'ekstern'),
  a('R17', 'P17', '2025-11-01', null, 'intern', 'struktureret'),
  a('R18', 'P18', '2025-06-01', null, 'intern', 'delvis'),
  a('R19', 'P19', '2019-01-01', null, 'intern'),
  a('R20', 'P20', '2009-01-01', null, 'intern'),
  a('R21', 'P21', '2015-10-01', null, 'ekstern'),
  a('R22', 'P22', '2020-08-01', null, 'ekstern'),
  a('R23', 'P23', '2018-04-01', null, 'ekstern'),
  a('R24', 'P24', '2019-01-01', null, 'ekstern'),
  a('R25', 'P25', '2022-05-01', null, 'ekstern'),
  a('R26', 'P26', '2024-09-01', null, 'ekstern', 'delvis'),
];
