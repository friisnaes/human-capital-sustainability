# Modelkatalog – Organizational Resilience Score™ og risikomodel

> Genereret automatisk fra koden (`npm run docs:model`). ORS-model v1.1, risikomodel v1.0. Tallene i eksempel B stammer fra de fiktive demonstrationsdata pr. 30.09.2026.

Modellen er en **forklarlig prototype til beslutningsstøtte**. Vægte, tærskler og normaliseringer er faglige antagelser, der skal kalibreres og valideres med virkelige data. Modellen påviser ikke årsagssammenhænge og bruger ingen branchebenchmarks.

## 1. Modelversioner

| Version | Gyldig fra | Ændring |
|---|---|---|
| ORS 1.0 | 2025-01-01 | Første version: vægtet gennemsnit af seks dimensioner. |
| ORS 1.1 | 2026-04-01 | Svaghedsloft indført: ORS kan højst være 30 point over den svageste dimension, så en høj gennemsnitsscore ikke skjuler en alvorlig enkeltstående svaghed. |
| Risiko 1.0 | 2025-01-01 | Prioritet ud fra konsekvens, eksponering og beredskab; sandsynlighed vises separat. |

Historik vises både som *rapporteret* (med den model, der var gældende i perioden) og *genberegnet* (med den gældende model).

## 2. Principper

- Manglende data bliver aldrig til nul. Observationer uden data udelades og trækker datadækningen ned.
- En dimension vises kun ved datadækning ≥ 60 %. ORS vises kun, når dimensioner med score udgør ≥ 75 % af vægten.
- Score og datakvalitet holdes adskilt. Datakvalitet er ikke statistisk sikkerhed.
- Koncernscoren beregnes på det samlede datagrundlag, ikke som gennemsnit af enhedsscorer. Successionsmatching sker på tværs af hele organisationen.
- Samme efterfølger dækker højst ét behov. Risici med samme rod tælles én gang i overblikket.
- Scorer vises som heltal; ændringer under 3 point vises som uændrede.
- Individuel afgangssandsynlighed udledes aldrig. Afgang simuleres kun som eksplicit antagelse.

## 3. ORS-formlen

```
vægtet gennemsnit = Σ(vægt_d × score_d) / Σ vægt_d        (kun dimensioner med score)
ORS               = min(vægtet gennemsnit; svageste dimension + 30)
```

| Dimension | Vægt | Begrundelse |
|---|---:|---|
| D1 Strategisk eksekveringskapacitet | 20 % | 20 %: direkte forbundet med strategiens gennemførelse. |
| D2 Robusthed i kritisk viden | 20 % | 20 %: tab af kritisk viden er den hurtigst virkende og sværest reversible sårbarhed. |
| D3 Successionsberedskab | 20 % | 20 %: kritiske roller bærer beslutningskraft, som ikke kan genskabes hurtigt. |
| D4 Ledelsesudviklingskapacitet | 15 % | 15 %: afgørende på 2–5 års sigt, men virker langsommere end D1–D3. |
| D5 Kulturel kontinuitet | 10 % | 10 %: vigtig, men datagrundlaget er yngst og mest indirekte. |
| D6 Tilpasningsevne | 15 % | 15 %: måler bevægelse over tid frem for niveau. |

Statusgrænser (scoren afrundes før klassifikation):

| Status | Grænse |
|---|---|
| Robust | ≥ 75 |
| Tilstrækkelig | 60–74 |
| Sårbar | 45–59 |
| Kritisk | < 45 |
| Utilstrækkeligt datagrundlag | dækningskrav ikke opfyldt |

## 4. Dimensioner og indikatorer

### D1 Strategisk eksekveringskapacitet (vægt 20 %)

**Formål:** Har organisationen den kapacitet og de besatte nøgleroller, som strategien kræver nu?

**Manglende data:** Kapabiliteter uden aktuel kapacitetsopgørelse (højst 6 mdr. gammel) udelades og trækker datadækningen ned.

#### I1.1 Kapacitetsdækning i strategiske kapabiliteter – 65 % af dimensionen

- **Spørgsmål:** Hvor stor en del af den krævede kapacitet findes?
- **Formel:** `Σ(fremtidig betydning × min(1; faktisk ÷ krævet årsværk)) ÷ Σ fremtidig betydning × 100`
- **Input og enhed:** Årsværk (FTE); betydning 1–5
- **Datakilder:** Ressourceplan (kvartalsvis); Direktionens vurdering af fremtidig betydning
- **Normalisering:** Dækning over 100 % tæller som 100 %, så overkapacitet ét sted ikke skjuler mangel et andet.
- **Manglende data:** Opgørelser ældre end 6 mdr. regnes som manglende.
- **Vægt:** 65 % af D1: kapacitet er den primære forudsætning for eksekvering.

#### I1.2 Besættelse af kritiske roller – 35 % af dimensionen

- **Spørgsmål:** Er rollerne med kritikalitet 4–5 besat?
- **Formel:** `Σ(kritikalitet × besat) ÷ Σ kritikalitet × 100, hvor besat = 1 eller 0`
- **Input og enhed:** Roller; kritikalitet 1–5
- **Datakilder:** Rollebesættelser (HR-system)
- **Normalisering:** Binær pr. rolle, vægtet med kritikalitet.
- **Manglende data:** Besættelse er altid kendt for registrerede roller.
- **Vægt:** 35 % af D1.

### D2 Robusthed i kritisk viden (vægt 20 %)

**Formål:** Kan kritisk viden overleve, at en person forsvinder?

**Manglende data:** Vidensområder uden dokumentationsvurdering indgår ikke i dokumentation og genetablering.

#### I2.1 Backup-dækning – 45 % af dimensionen

- **Spørgsmål:** Hvor mange kvalificerede holdere har hvert kritisk vidensområde?
- **Formel:** `Vægtet gennemsnit (kritikalitet) af: 0–1 holder = 0, 2 holdere = 60, 3 eller flere = 100`
- **Input og enhed:** Antal holdere (ekspert eller praktiker); personer under oplæring tæller ikke
- **Datakilder:** Vidensregister
- **Normalisering:** Trinvis, fordi én holder er en enkeltpersonsafhængighed uanset dygtighed.
- **Manglende data:** Holdere er altid kendt for registrerede vidensområder.
- **Vægt:** 45 % af D2: koncentration hos én person er den mest direkte form for skrøbelighed, modellen måler.

#### I2.2 Dokumentationsgrad – 30 % af dimensionen

- **Spørgsmål:** Er den kritiske viden beskrevet, så andre kan bruge den?
- **Formel:** `Vægtet gennemsnit (kritikalitet) af niveau 0 = 0, 1 = 35, 2 = 70, 3 = 100`
- **Input og enhed:** Dokumentationsniveau 0–3
- **Datakilder:** Vidensregister: dokumentationsvurdering
- **Normalisering:** Niveauerne er ordinale; afstandene er en antagelse, der skal kalibreres.
- **Manglende data:** Vidensområder uden vurdering udelades og trækker datadækningen ned.
- **Vægt:** 30 % af D2.

#### I2.3 Genetableringstid – 25 % af dimensionen

- **Spørgsmål:** Hvor længe tager det at genopbygge viden, hvis den primære holder forsvinder?
- **Formel:** `Med mindst 2 holdere: 2 mdr. Ellers: basistid × dokumentationsfaktor (1; 0,85; 0,6; 0,45). Score = (18 − måneder) ÷ 16 × 100, afgrænset til 0–100`
- **Input og enhed:** Måneder
- **Datakilder:** Vidensregister: basistid for genopbygning; Dokumentationsniveau
- **Normalisering:** Lineær mellem 2 mdr. (100) og 18 mdr. (0).
- **Manglende data:** Kan ikke beregnes uden dokumentationsvurdering. Er der ingen kvalificerede holdere tilbage, er viden allerede tabt, og scoren er 0.
- **Vægt:** 25 % af D2: overlapper delvist med backup-dækning og vægtes derfor lavere.

### D3 Successionsberedskab (vægt 20 %)

**Formål:** Kan kritiske roller besættes, hvis indehaveren forsvinder – nu og inden for to år?

**Manglende data:** Kritiske roller uden registreret successionsplan regnes som manglende data – ikke som nul – og trækker datadækningen ned.

#### I3.1 Effektiv successionsdækning inden for 2 år – 60 % af dimensionen

- **Spørgsmål:** Har kritiske roller en efterfølger klar inden for to år, når hver kandidat kun kan dække ét behov?
- **Formel:** `Σ(kritikalitet × dækket) ÷ Σ kritikalitet × 100 efter prioriteret matching af kandidater (klar nu eller 1–2 år)`
- **Input og enhed:** Kritiske roller (kritikalitet 4–5)
- **Datakilder:** Successionsplaner; Beredskabsvurderinger
- **Normalisering:** Binær pr. rolle. Matchingen tildeler kandidater til de mest kritiske roller først.
- **Manglende data:** Roller uden registreret plan udelades og trækker datadækningen ned.
- **Vægt:** 60 % af D3.

#### I3.2 Nødberedskab (klar nu) – 40 % af dimensionen

- **Spørgsmål:** Kan kritiske roller dækkes i morgen?
- **Formel:** `Som I3.1, men kun kandidater vurderet klar nu`
- **Input og enhed:** Kritiske roller
- **Datakilder:** Successionsplaner; Beredskabsvurderinger
- **Normalisering:** Binær pr. rolle efter matching.
- **Manglende data:** Som I3.1.
- **Vægt:** 40 % af D3.

### D4 Ledelsesudviklingskapacitet (vægt 15 %)

**Formål:** Udvikler lederne faktisk nye ledere – målt på observerbare forhold?

**Manglende data:** Progression kræver mindst tre kandidater med en vurdering for 12 mdr. siden; ellers vises utilstrækkeligt datagrundlag.

#### I4.1 Ledere, der udvikler efterfølgere – 30 % af dimensionen

- **Spørgsmål:** Hvor mange ledere har mindst én kandidat i dokumenteret udvikling?
- **Formel:** `Andel lederroller med mindst én kandidat med udviklingsforløb eller uddelegeret ansvar inden for 12 mdr. × 100 (ubesatte lederroller tæller som 0)`
- **Input og enhed:** Lederroller
- **Datakilder:** Successionsplaner; HR-system: udviklingsforløb og delegationer
- **Normalisering:** Binær pr. lederrolle.
- **Manglende data:** Lederroller uden plan udelades og trækker datadækningen ned.
- **Vægt:** 30 % af D4: direkte mål for "ledere udvikler ledere".

#### I4.2 Aktive udviklingsforløb – 25 % af dimensionen

- **Spørgsmål:** Er efterfølgerkandidaterne i et dokumenteret udviklingsforløb?
- **Formel:** `Andel unikke kandidater med udviklingsforløb aktivt inden for 12 mdr. × 100`
- **Input og enhed:** Kandidater
- **Datakilder:** HR-system: udviklingsforløb
- **Normalisering:** Binær pr. kandidat.
- **Manglende data:** Ingen kandidater = intet at måle (indikatoren udelades).
- **Vægt:** 25 % af D4.

#### I4.3 Uddelegeret ansvar – 25 % af dimensionen

- **Spørgsmål:** Får kandidaterne reelt ansvar, før de skal overtage?
- **Formel:** `Andel unikke kandidater med uddelegeret ansvar inden for 12 mdr. × 100`
- **Input og enhed:** Kandidater
- **Datakilder:** HR-system: konstitueringer og delegationer
- **Normalisering:** Binær pr. kandidat.
- **Manglende data:** Som I4.2.
- **Vægt:** 25 % af D4.

#### I4.4 Beredskabsprogression – 20 % af dimensionen

- **Spørgsmål:** Bliver kandidaterne faktisk mere klar over tid?
- **Formel:** `Andel kandidater, hvis beredskab er forbedret over 12 mdr. × 100 (kun kandidater med vurdering for 12 mdr. siden)`
- **Input og enhed:** Kandidat-rolle-par
- **Datakilder:** Daterede beredskabsvurderinger
- **Normalisering:** Binær: forbedret = 100, uændret eller forværret = 0.
- **Manglende data:** Mindst 3 observationer kræves. Minimum 3 observationer.
- **Vægt:** 20 % af D4: afhænger af vurderinger og vægtes derfor lavest.

### D5 Kulturel kontinuitet (vægt 10 %)

**Formål:** Er de praksisser, der bærer samarbejde, læring og beslutninger, forankret i organisationen frem for i enkeltpersoner?

**Manglende data:** Enheder uden registrerede praksisser har intet datagrundlag. Dimensionen udelades, og ORS beregnes på de øvrige dimensioner, hvis de dækker mindst 75 % af vægten.

#### I5.1 Praksisforankring – 40 % af dimensionen

- **Spørgsmål:** Bæres kritiske praksisser af organisationen eller af enkeltpersoner?
- **Formel:** `Vægtet gennemsnit (betydning) af: formaliseret (formel ejer og beskrevet) og mindst 2 bærere = 100; enten formaliseret eller mindst 2 bærere = 50; ellers 0`
- **Input og enhed:** Praksisser; betydning 1–5
- **Datakilder:** Praksisregister
- **Normalisering:** Tretrins skala.
- **Manglende data:** Enheder uden registrerede praksisser har intet datagrundlag (dækning 0).
- **Vægt:** 40 % af D5.

#### I5.2 Gennemførelsesgrad – 35 % af dimensionen

- **Spørgsmål:** Bliver praksisserne faktisk gennemført som planlagt?
- **Formel:** `Vægtet gennemsnit (betydning) af andel afholdte gennemførelser × 100`
- **Input og enhed:** Andel 0–1
- **Datakilder:** Mødekalendere, opgjort på aggregeret niveau
- **Normalisering:** Andel × 100.
- **Manglende data:** Opgørelser ældre end 6 mdr. regnes som manglende.
- **Vægt:** 35 % af D5.

#### I5.3 Struktureret onboarding – 25 % af dimensionen

- **Spørgsmål:** Bliver nye indehavere af nøgleroller introduceret til organisationens praksis?
- **Formel:** `Gennemsnit af struktureret = 100, delvis = 50, ingen = 0 for besættelser de seneste 12 mdr.`
- **Input og enhed:** Besættelser
- **Datakilder:** HR-system: onboarding-registrering
- **Normalisering:** Tretrins skala.
- **Manglende data:** Besættelser uden registrering udelades; ingen nye besættelser = intet at måle.
- **Vægt:** 25 % af D5.

### D6 Tilpasningsevne (vægt 15 %)

**Formål:** Lukker organisationen sine kapabilitetsgab, leverer den sine milepæle, og kan den flytte mennesker mod nye behov?

**Manglende data:** Indikatorer med for få observationer (fx under to afgjorte milepæle) udelades og trækker datadækningen ned.

#### I6.1 Lukning af kapabilitetsgab – 40 % af dimensionen

- **Spørgsmål:** Lukkes gabet i strategiske kapabiliteter?
- **Formel:** `(Σ gab for 12 mdr. siden − Σ gab nu) ÷ Σ gab for 12 mdr. siden ÷ 0,5 × 100, afgrænset til 0–100`
- **Input og enhed:** Årsværk
- **Datakilder:** Ressourceplan
- **Normalisering:** 50 % lukning på 12 mdr. giver fuld score. Øget behov tæller som større gab.
- **Manglende data:** Kapabiliteter uden data både nu og for 12 mdr. siden udelades.
- **Vægt:** 40 % af D6. Måler bevægelse; I1.1 måler niveau – samme data, forskellige spørgsmål.

#### I6.2 Rettidige strategiske milepæle – 35 % af dimensionen

- **Spørgsmål:** Leverer organisationen sine omstillingsmilepæle?
- **Formel:** `Andel milepæle med planlagt dato inden for 12 mdr., der er gennemført senest 30 dage efter plan × 100`
- **Input og enhed:** Milepæle
- **Datakilder:** Strategiplan og milepælsopfølgning
- **Normalisering:** Binær pr. milepæl. Milepæle inden for tolerancen, der endnu ikke er gennemført, udelades.
- **Manglende data:** Mindst 2 afgjorte milepæle kræves. Minimum 2 observationer.
- **Vægt:** 35 % af D6.

#### I6.3 Intern mobilitet til strategiske roller – 25 % af dimensionen

- **Spørgsmål:** Kan organisationen selv flytte mennesker mod nye behov?
- **Formel:** `Andel besættelser af roller i strategiske kapabiliteter de seneste 24 mdr., der er besat internt × 100`
- **Input og enhed:** Besættelser
- **Datakilder:** Rollebesættelser (HR-system)
- **Normalisering:** Binær pr. besættelse.
- **Manglende data:** Mindst 2 besættelser kræves. Minimum 2 observationer.
- **Vægt:** 25 % af D6.

## 5. Parametre

- Kritisk rolle: kritikalitet ≥ 4. Kritisk viden: ≥ 3 i D2, ≥ 4 kan udløse risici. Strategisk kapabilitet: fremtidig betydning ≥ 4.
- Dokumentation 0–3 → 0 / 35 / 70 / 100. Genetableringsfaktor 1 / 0.85 / 0.6 / 0.45. Med ≥ 2 holdere: 2 mdr.
- Genetableringsscore lineær fra 2 mdr. (100) til 18 mdr. (0).
- Gablukning: 50 % lukning på 12 mdr. = 100. Milepælstolerance 30 dage.
- Tidsvinduer: evidens 12 mdr., progression 12 mdr., onboarding 12 mdr., mobilitet 24 mdr.
- Aktualitet: kapacitet og gennemførelse ≤ 6 mdr.; successionsreview ≤ 13 mdr.; dokumentationsvurdering ≤ 24 mdr.

## 6. Succession

- **Klar nu:** kan overtage nu med normal introduktion. **1–2 år:** forventes klar med planlagt udvikling. **3–5 år:** tæller ikke som dækning.
- **Dokumenteret evidens:** vurderingen henviser til registrerede udviklingsforløb, uddelegeret ansvar, leverancer eller certificeringer. **Menneskelig vurdering:** skøn uden registreret evidens.
- **Effektiv dækning:** prioriteret bipartit matching (Kuhns algoritme). Prioritet: kritikalitet, derefter højeste fremtidige betydning, derefter tidligste strategiske frist, derefter rolle-id. En dækket rolle mister aldrig dækning til en lavere prioriteret. Hver kandidat dækker højst ét behov.
- **Ubesat lederrolle** tæller som 0 i I4.1.
- **Tabt viden** (ingen kvalificerede holdere) giver genetableringsscore 0.

## 7. Risikomodel

```
prioritet = 100 × K × E × (6 − B) / 125
```

| Kategori | K (konsekvens) | E (eksponering) | B (beredskab, start 1, maks. 5) |
|---|---|---|---|
| Successionsgab | (kritikalitet + højeste fremtidige betydning) / 2; uden vurdering: kritikalitet | ubesat/ingen kandidater 5; kun 3–5 år eller ingen plan 4; dobbeltbooket 3; intet nødberedskab (klar inden for 2 år, ingen klar nu) 2 | +1 kandidat klar nu; +1 viden dokumenteret; +1 viden delt; +1 kandidat i dokumenteret udvikling |
| Videnskoncentration | (kritikalitet + fremtidig betydning) / 2; uden vurdering: kritikalitet | én holder: basistid ≥ 12 mdr. 5, 6–11 4, < 6 3; ingen holdere 5 | + dokumentationsniveau (0–3; ikke vurderet giver intet tillæg); +1 person under oplæring |
| Kapacitetsgab | fremtidig betydning | dækning < 50 % 5; < 65 % 4; < 80 % 3 | +1 pr. person i omstilling/udvikling (maks. 2); +1 ved ≥ 25 % lukning på 12 mdr. |
| Kulturbærer | betydning − 1 | én bærer 4; ingen 5 | +1 beskrevet; +1 formel ejer; +1 gennemført ≥ 80 % |

Bånd: kritisk ≥ 60, høj ≥ 35, moderat ≥ 15, ellers lav. Vurderet sandsynlighed vises separat og indgår ikke i prioriteten.

## 8. Gennemregnede eksempler

### Eksempel A – kontrolleret testdatasæt (src/model/testutil.ts, verificeret i src/model/model.test.ts)

| Trin | Beregning |
|---|---|
| D1 | I1.1 = (5 × 70 + 3 × 100) / 8 = 81,25; I1.2 = 100; D1 = 0,65 × 81,25 + 0,35 × 100 = 87,81 |
| D2 | I2.1 = 240/9 = 26,67; I2.2 = 575/9 = 63,89; I2.3 = 643,75/9 = 71,53; D2 = 49,05 |
| D3 | Kandidat PX er nævnt til både RA (krit. 5) og RB (krit. 4) og tildeles RA. I3.1 = 500/9 = 55,56; I3.2 = 400/9 = 44,44; dækning 9/13. D3 = 51,11 |
| D4 | Ingen dokumenteret udvikling = 0 (I4.4 udeladt: 2 < 3 observationer) |
| D5 | Dækning 25 % < 60 % → utilstrækkeligt datagrundlag, udeladt |
| D6 | I6.1 = 100 (gab 6 → 3); I6.2 = 50; I6.3 ikke relevant; D6 = (0,40 × 100 + 0,35 × 50) / 0,75 = 76,67 |
| ORS | Vægtet gennemsnit = 54,55; loft = 0 + 30 = 30; **ORS = 30** (kritisk). Model 1.0 (uden loft): 54,55 |

### Eksempel B – demonstrationsdata pr. 30.09.2026, hele organisationen

| Dimension | Score | Datadækning |
|---|---:|---:|
| D1 Strategisk eksekveringskapacitet | 86,5 | 100 % |
| D2 Robusthed i kritisk viden | 58,6 | 100 % |
| D3 Successionsberedskab | 56,3 | 95 % |
| D4 Ledelsesudviklingskapacitet | 46,4 | 97 % |
| D5 Kulturel kontinuitet | 75,7 | 100 % |
| D6 Tilpasningsevne | 54,8 | 100 % |

Vægtet gennemsnit 63; loft 76,4; **ORS 63 → vises som 63**.

De tre højest prioriterede risici med forskellig rod:

- SUC-R20 Successionsgab: Seniorspecialist, hydraulisk simulering: 100 × 5 × 4 × (6 − 2) / 125 = **64**
- VID-K01 Videnskoncentration: Kalibrering af prediktive nedbrudsmodeller: 100 × 5 × 5 × (6 − 3) / 125 = **60**
- KAP-C01 Kapacitetsgab: Prediktiv analyse og datavidenskab: 100 × 5 × 5 × (6 − 3) / 125 = **60**

## 9. Antagelser og begrænsninger

- Vægte, tærskler og normaliseringer er ikke empirisk kalibrerede.
- Mange input er menneskelige vurderinger; kvaliteten afhænger af ensartede vurderingsprocesser.
- Kapacitet måles i årsværk; kompetenceniveau inden for årsværkene indgår ikke.
- Kultur måles kun som praksis og infrastruktur – ikke holdninger, trivsel eller tillid.
- Scoren viser sårbarhed, ikke årsagssammenhænge.
- Flere indikatorer er andele; når en person uden registreret udvikling forlader kandidatpuljen, kan en andel stige uden reel forbedring.
