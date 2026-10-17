/**
 * Modelkatalog: brugerrettede beskrivelser af dimensioner og indikatorer.
 * Tekst og tal vises i platformen og i dokumentationen fra samme kilde.
 */
import type { DimensionId, IndicatorId } from './config';

export interface DimensionDoc {
  id: DimensionId;
  name: string;
  short: string;
  purpose: string;
  weightRationale: string;
  missingData: string;
}

export interface IndicatorDoc {
  id: IndicatorId;
  dimension: DimensionId;
  name: string;
  question: string;
  formula: string;
  unit: string;
  sources: string[];
  normalization: string;
  missing: string;
  weightRationale: string;
}

export const DIMENSIONS: Record<DimensionId, DimensionDoc> = {
  D1: {
    id: 'D1',
    name: 'Strategisk eksekveringskapacitet',
    short: 'Eksekvering',
    purpose: 'Har organisationen den kapacitet og de besatte nøgleroller, som strategien kræver nu?',
    weightRationale: '20 %: direkte forbundet med strategiens gennemførelse.',
    missingData: 'Kapabiliteter uden aktuel kapacitetsopgørelse (højst 6 mdr. gammel) udelades og trækker datadækningen ned.',
  },
  D2: {
    id: 'D2',
    name: 'Robusthed i kritisk viden',
    short: 'Viden',
    purpose: 'Kan kritisk viden overleve, at en person forsvinder?',
    weightRationale: '20 %: tab af kritisk viden er den hurtigst virkende og sværest reversible sårbarhed.',
    missingData: 'Vidensområder uden dokumentationsvurdering indgår ikke i dokumentation og genetablering.',
  },
  D3: {
    id: 'D3',
    name: 'Successionsberedskab',
    short: 'Succession',
    purpose: 'Kan kritiske roller besættes, hvis indehaveren forsvinder – nu og inden for to år?',
    weightRationale: '20 %: kritiske roller bærer beslutningskraft, som ikke kan genskabes hurtigt.',
    missingData: 'Kritiske roller uden registreret successionsplan regnes som manglende data – ikke som nul – og trækker datadækningen ned.',
  },
  D4: {
    id: 'D4',
    name: 'Ledelsesudviklingskapacitet',
    short: 'Lederudvikling',
    purpose: 'Udvikler lederne faktisk nye ledere – målt på observerbare forhold?',
    weightRationale: '15 %: afgørende på 2–5 års sigt, men virker langsommere end D1–D3.',
    missingData: 'Progression kræver mindst tre kandidater med en vurdering for 12 mdr. siden; ellers vises utilstrækkeligt datagrundlag.',
  },
  D5: {
    id: 'D5',
    name: 'Kulturel kontinuitet',
    short: 'Kultur',
    purpose: 'Er de praksisser, der bærer samarbejde, læring og beslutninger, forankret i organisationen frem for i enkeltpersoner?',
    weightRationale: '10 %: vigtig, men datagrundlaget er yngst og mest indirekte.',
    missingData: 'Enheder uden registrerede praksisser har intet datagrundlag. Dimensionen udelades, og ORS beregnes på de øvrige dimensioner, hvis de dækker mindst 75 % af vægten.',
  },
  D6: {
    id: 'D6',
    name: 'Tilpasningsevne',
    short: 'Tilpasning',
    purpose: 'Lukker organisationen sine kapabilitetsgab, leverer den sine milepæle, og kan den flytte mennesker mod nye behov?',
    weightRationale: '15 %: måler bevægelse over tid frem for niveau.',
    missingData: 'Indikatorer med for få observationer (fx under to afgjorte milepæle) udelades og trækker datadækningen ned.',
  },
};

export const INDICATORS: Record<IndicatorId, IndicatorDoc> = {
  'I1.1': {
    id: 'I1.1', dimension: 'D1', name: 'Kapacitetsdækning i strategiske kapabiliteter',
    question: 'Hvor stor en del af den krævede kapacitet findes?',
    formula: 'Σ(fremtidig betydning × min(1; faktisk ÷ krævet årsværk)) ÷ Σ fremtidig betydning × 100',
    unit: 'Årsværk (FTE); betydning 1–5',
    sources: ['Ressourceplan (kvartalsvis)', 'Direktionens vurdering af fremtidig betydning'],
    normalization: 'Dækning over 100 % tæller som 100 %, så overkapacitet ét sted ikke skjuler mangel et andet.',
    missing: 'Opgørelser ældre end 6 mdr. regnes som manglende.',
    weightRationale: '65 % af D1: kapacitet er den primære forudsætning for eksekvering.',
  },
  'I1.2': {
    id: 'I1.2', dimension: 'D1', name: 'Besættelse af kritiske roller',
    question: 'Er rollerne med kritikalitet 4–5 besat?',
    formula: 'Σ(kritikalitet × besat) ÷ Σ kritikalitet × 100, hvor besat = 1 eller 0',
    unit: 'Roller; kritikalitet 1–5',
    sources: ['Rollebesættelser (HR-system)'],
    normalization: 'Binær pr. rolle, vægtet med kritikalitet.',
    missing: 'Besættelse er altid kendt for registrerede roller.',
    weightRationale: '35 % af D1.',
  },
  'I2.1': {
    id: 'I2.1', dimension: 'D2', name: 'Backup-dækning',
    question: 'Hvor mange kvalificerede holdere har hvert kritisk vidensområde?',
    formula: 'Vægtet gennemsnit (kritikalitet) af: 0–1 holder = 0, 2 holdere = 60, 3 eller flere = 100',
    unit: 'Antal holdere (ekspert eller praktiker); personer under oplæring tæller ikke',
    sources: ['Vidensregister'],
    normalization: 'Trinvis, fordi én holder er en enkeltpersonsafhængighed uanset dygtighed.',
    missing: 'Holdere er altid kendt for registrerede vidensområder.',
    weightRationale: '45 % af D2: koncentration hos én person er den mest direkte form for skrøbelighed, modellen måler.',
  },
  'I2.2': {
    id: 'I2.2', dimension: 'D2', name: 'Dokumentationsgrad',
    question: 'Er den kritiske viden beskrevet, så andre kan bruge den?',
    formula: 'Vægtet gennemsnit (kritikalitet) af niveau 0 = 0, 1 = 35, 2 = 70, 3 = 100',
    unit: 'Dokumentationsniveau 0–3',
    sources: ['Vidensregister: dokumentationsvurdering'],
    normalization: 'Niveauerne er ordinale; afstandene er en antagelse, der skal kalibreres.',
    missing: 'Vidensområder uden vurdering udelades og trækker datadækningen ned.',
    weightRationale: '30 % af D2.',
  },
  'I2.3': {
    id: 'I2.3', dimension: 'D2', name: 'Genetableringstid',
    question: 'Hvor længe tager det at genopbygge viden, hvis den primære holder forsvinder?',
    formula: 'Med mindst 2 holdere: 2 mdr. Ellers: basistid × dokumentationsfaktor (1; 0,85; 0,6; 0,45). Score = (18 − måneder) ÷ 16 × 100, afgrænset til 0–100',
    unit: 'Måneder',
    sources: ['Vidensregister: basistid for genopbygning', 'Dokumentationsniveau'],
    normalization: 'Lineær mellem 2 mdr. (100) og 18 mdr. (0).',
    missing: 'Kan ikke beregnes uden dokumentationsvurdering. Er der ingen kvalificerede holdere tilbage, er viden allerede tabt, og scoren er 0.',
    weightRationale: '25 % af D2: overlapper delvist med backup-dækning og vægtes derfor lavere.',
  },
  'I3.1': {
    id: 'I3.1', dimension: 'D3', name: 'Effektiv successionsdækning inden for 2 år',
    question: 'Har kritiske roller en efterfølger klar inden for to år, når hver kandidat kun kan dække ét behov?',
    formula: 'Σ(kritikalitet × dækket) ÷ Σ kritikalitet × 100 efter prioriteret matching af kandidater (klar nu eller 1–2 år)',
    unit: 'Kritiske roller (kritikalitet 4–5)',
    sources: ['Successionsplaner', 'Beredskabsvurderinger'],
    normalization: 'Binær pr. rolle. Matchingen tildeler kandidater til de mest kritiske roller først.',
    missing: 'Roller uden registreret plan udelades og trækker datadækningen ned.',
    weightRationale: '60 % af D3.',
  },
  'I3.2': {
    id: 'I3.2', dimension: 'D3', name: 'Nødberedskab (klar nu)',
    question: 'Kan kritiske roller dækkes i morgen?',
    formula: 'Som I3.1, men kun kandidater vurderet klar nu',
    unit: 'Kritiske roller',
    sources: ['Successionsplaner', 'Beredskabsvurderinger'],
    normalization: 'Binær pr. rolle efter matching.',
    missing: 'Som I3.1.',
    weightRationale: '40 % af D3.',
  },
  'I4.1': {
    id: 'I4.1', dimension: 'D4', name: 'Ledere, der udvikler efterfølgere',
    question: 'Hvor mange ledere har mindst én kandidat i dokumenteret udvikling?',
    formula: 'Andel lederroller med mindst én kandidat med udviklingsforløb eller uddelegeret ansvar inden for 12 mdr. × 100 (ubesatte lederroller tæller som 0)',
    unit: 'Lederroller',
    sources: ['Successionsplaner', 'HR-system: udviklingsforløb og delegationer'],
    normalization: 'Binær pr. lederrolle.',
    missing: 'Lederroller uden plan udelades og trækker datadækningen ned.',
    weightRationale: '30 % af D4: direkte mål for "ledere udvikler ledere".',
  },
  'I4.2': {
    id: 'I4.2', dimension: 'D4', name: 'Aktive udviklingsforløb',
    question: 'Er efterfølgerkandidaterne i et dokumenteret udviklingsforløb?',
    formula: 'Andel unikke kandidater med udviklingsforløb aktivt inden for 12 mdr. × 100',
    unit: 'Kandidater',
    sources: ['HR-system: udviklingsforløb'],
    normalization: 'Binær pr. kandidat.',
    missing: 'Ingen kandidater = intet at måle (indikatoren udelades).',
    weightRationale: '25 % af D4.',
  },
  'I4.3': {
    id: 'I4.3', dimension: 'D4', name: 'Uddelegeret ansvar',
    question: 'Får kandidaterne reelt ansvar, før de skal overtage?',
    formula: 'Andel unikke kandidater med uddelegeret ansvar inden for 12 mdr. × 100',
    unit: 'Kandidater',
    sources: ['HR-system: konstitueringer og delegationer'],
    normalization: 'Binær pr. kandidat.',
    missing: 'Som I4.2.',
    weightRationale: '25 % af D4.',
  },
  'I4.4': {
    id: 'I4.4', dimension: 'D4', name: 'Beredskabsprogression',
    question: 'Bliver kandidaterne faktisk mere klar over tid?',
    formula: 'Andel kandidater, hvis beredskab er forbedret over 12 mdr. × 100 (kun kandidater med vurdering for 12 mdr. siden)',
    unit: 'Kandidat-rolle-par',
    sources: ['Daterede beredskabsvurderinger'],
    normalization: 'Binær: forbedret = 100, uændret eller forværret = 0.',
    missing: 'Mindst 3 observationer kræves.',
    weightRationale: '20 % af D4: afhænger af vurderinger og vægtes derfor lavest.',
  },
  'I5.1': {
    id: 'I5.1', dimension: 'D5', name: 'Praksisforankring',
    question: 'Bæres kritiske praksisser af organisationen eller af enkeltpersoner?',
    formula: 'Vægtet gennemsnit (betydning) af: formaliseret (formel ejer og beskrevet) og mindst 2 bærere = 100; enten formaliseret eller mindst 2 bærere = 50; ellers 0',
    unit: 'Praksisser; betydning 1–5',
    sources: ['Praksisregister'],
    normalization: 'Tretrins skala.',
    missing: 'Enheder uden registrerede praksisser har intet datagrundlag (dækning 0).',
    weightRationale: '40 % af D5.',
  },
  'I5.2': {
    id: 'I5.2', dimension: 'D5', name: 'Gennemførelsesgrad',
    question: 'Bliver praksisserne faktisk gennemført som planlagt?',
    formula: 'Vægtet gennemsnit (betydning) af andel afholdte gennemførelser × 100',
    unit: 'Andel 0–1',
    sources: ['Mødekalendere, opgjort på aggregeret niveau'],
    normalization: 'Andel × 100.',
    missing: 'Opgørelser ældre end 6 mdr. regnes som manglende.',
    weightRationale: '35 % af D5.',
  },
  'I5.3': {
    id: 'I5.3', dimension: 'D5', name: 'Struktureret onboarding',
    question: 'Bliver nye indehavere af nøgleroller introduceret til organisationens praksis?',
    formula: 'Gennemsnit af struktureret = 100, delvis = 50, ingen = 0 for besættelser de seneste 12 mdr.',
    unit: 'Besættelser',
    sources: ['HR-system: onboarding-registrering'],
    normalization: 'Tretrins skala.',
    missing: 'Besættelser uden registrering udelades; ingen nye besættelser = intet at måle.',
    weightRationale: '25 % af D5.',
  },
  'I6.1': {
    id: 'I6.1', dimension: 'D6', name: 'Lukning af kapabilitetsgab',
    question: 'Lukkes gabet i strategiske kapabiliteter?',
    formula: '(Σ gab for 12 mdr. siden − Σ gab nu) ÷ Σ gab for 12 mdr. siden ÷ 0,5 × 100, afgrænset til 0–100',
    unit: 'Årsværk',
    sources: ['Ressourceplan'],
    normalization: '50 % lukning på 12 mdr. giver fuld score. Øget behov tæller som større gab.',
    missing: 'Kapabiliteter uden data både nu og for 12 mdr. siden udelades.',
    weightRationale: '40 % af D6. Måler bevægelse; I1.1 måler niveau – samme data, forskellige spørgsmål.',
  },
  'I6.2': {
    id: 'I6.2', dimension: 'D6', name: 'Rettidige strategiske milepæle',
    question: 'Leverer organisationen sine omstillingsmilepæle?',
    formula: 'Andel milepæle med planlagt dato inden for 12 mdr., der er gennemført senest 30 dage efter plan × 100',
    unit: 'Milepæle',
    sources: ['Strategiplan og milepælsopfølgning'],
    normalization: 'Binær pr. milepæl. Milepæle inden for tolerancen, der endnu ikke er gennemført, udelades.',
    missing: 'Mindst 2 afgjorte milepæle kræves.',
    weightRationale: '35 % af D6.',
  },
  'I6.3': {
    id: 'I6.3', dimension: 'D6', name: 'Intern mobilitet til strategiske roller',
    question: 'Kan organisationen selv flytte mennesker mod nye behov?',
    formula: 'Andel besættelser af roller i strategiske kapabiliteter de seneste 24 mdr., der er besat internt × 100',
    unit: 'Besættelser',
    sources: ['Rollebesættelser (HR-system)'],
    normalization: 'Binær pr. besættelse.',
    missing: 'Mindst 2 besættelser kræves.',
    weightRationale: '25 % af D6.',
  },
};

export const STATUS_LABEL = {
  robust: 'Robust',
  tilstrækkelig: 'Tilstrækkelig',
  sårbar: 'Sårbar',
  kritisk: 'Kritisk',
  utilstrækkelig: 'Utilstrækkeligt datagrundlag',
} as const;

export const STATUS_TEXT = {
  robust: 'Organisationen kan bære tab af enkeltpersoner uden væsentlig forsinkelse af strategien.',
  tilstrækkelig: 'Grundlæggende bæreevne, men med afgrænsede sårbarheder, der kræver handling.',
  sårbar: 'Væsentlige afhængigheder, som kan forsinke strategien ved tab af nøglepersoner.',
  kritisk: 'Strategien hviler på få personer eller kapabiliteter uden backup.',
  utilstrækkelig: 'Datagrundlaget er for spinkelt til en forsvarlig score.',
} as const;
