# Testrapport – faktisk udførte kontroller

Kørt 16. oktober 2026 i et Linux-miljø med Node.js 22, Chromium (Playwright 1.56) og PostgreSQL 16. Kun kontroller, der rent faktisk er kørt, står her.

## 1. Automatiske kontroller i repositoryet

| Kontrol | Kommando | Resultat |
|---|---|---|
| Typecheck (strict, inkl. `noUncheckedIndexedAccess`) | `npm run typecheck` | Ingen fejl |
| Enhedstests | `npm test` | 53 af 53 består (2 testfiler) |
| Produktionsbuild | `npm run build` | Bygget uden fejl og advarsler |
| End-to-end i Chromium | `npm run e2e` | 24 af 24 består (8 forløb × desktop 1440, tablet 834, mobil 390) |
| Modelkatalog genereret fra koden | `npm run docs:model` | `docs/MODELKATALOG.md` skrevet |

### Enhedstests dækker

- **Scoreberegning og vægtning:** et kontrolleret testdatasæt med håndregnede værdier for alle seks dimensioner og ORS (eksempel A i modelkataloget).
- **Grænseværdier:** statusgrænser 45/60/75 med afrunding (74,5 → robust, 59,49 → sårbar), risikobånd 15/35/60, genetableringsscore 2 og 18 mdr.
- **Manglende og utilstrækkelige data:** manglende observationer bliver ikke til nul; minimumsantal observationer; dimension under 60 % dækning udelades; ORS under 75 % vægtdækning vises ikke; manglende register skelnes fra "intet at måle".
- **Aggregering mellem enheder:** enhedsscore beregnes på enhedens egne data; koncernscore på det samlede grundlag.
- **Scenarier:** grunddata ændres aldrig; tomt scenarie giver samme resultat som platformen; tab af person, oprykning med kaskade, efterfølger klar, videnoverførsel og øget behov.
- **Dobbeltbooking af efterfølgere:** samme kandidat dækker kun én rolle; prioriteret matching med forøgende stier; dokumenteret prioritet ved lige kritikalitet.
- **Sammenhæng mellem dashboard og detaljer:** dimensioner genberegnes fra indikatorer; risikoprioriteter genberegnes fra faktorer; enkeltpersonsafhængigheder genfindes som risici; top-risici har forskellige rødder.
- **Historik:** 13 snapshots, markering af modelskift (v1.1 april 2026) og ændret datagrundlag (kulturel kontinuitet fra februar 2026).
- **Periodekorrekthed:** risikobehandlinger og handlinger vises først fra registreringsdatoen; historisk handlingsstatus udledes af start og frist.
- **Data:** referentiel validering af hele demodatasættet; krav til antal enheder, roller og kapabiliteter.
- **Eksport:** CSV-escaping, BOM, demomarkering, filtre og modelversion; eksporten indeholder præcis udsnittet.

### End-to-end-forløb (Playwright)

1. Fra overblik til identificeret risiko og anbefalet handling (åbning, formel, Esc lukker, adresse opdateres).
2. Fra kritisk rolle til successionsgab (effektiv dækning, dobbeltbooking).
3. Fra scenarieinput til forklarligt resultat (antagelser, adresse, nulstilling).
4. Fra filtreret dashboard til eksport (CSV-indhold sammenholdt med antal viste rækker).
5. Direkte sidelink med enhed, periode og åben detalje virker efter genindlæsning.
6. Alle 12 sider + ukendt side åbner uden JavaScript-fejl og uden vandret rulning.
7. Spring-til-indhold-linket flytter fokus uden at ændre side eller filtre.
8. Successionsscenarie i en historisk periode beregnes korrekt.

## 2. Supplerende kontroller

| Kontrol | Metode | Resultat |
|---|---|---|
| Alle sider × alle enheder × fire perioder × tre bredder | Scriptet `scripts/shots.mjs` (Playwright) åbnede 864 visninger (12 sider × 6 udsnit × 4 perioder × 320/834/1440 px) | 0 JavaScript-fejl. 48 visninger (Leadership Pipeline og Modelkatalog ved 320 px) havde vandret overløb; rettet, og 320 px-gennemløbet (288 visninger) kørt igen med 0 overløb og 0 fejl |
| Visuel inspektion | Skærmbilleder af alle moduler i 1440 px, udvalgte i 834 og 390 px, gennemset manuelt | Rettet: overløb på mobil, afklippede tabeller, grafens layout, ombrydning af lange ord |
| Printvisning | Bestyrelsesrapporten udskrevet til PDF i Chromium (A4) | 3 sider, sidefod med demomarkering og sidetal, ingen afklippede tabeller |
| Kontrast | Beregnet WCAG-kontrast for alle teksttokens mod alle baggrunde | Mindst 4,7:1 (AA) |
| SQL-skema | `db/schema.sql` kørt mod en midlertidig PostgreSQL 16 | 37 tabeller oprettet uden fejl |
| Uafhængig gennemgang | En separat agent, der ikke havde skrevet koden, gennemgik kode og kørende app | 11 fejl fundet og rettet (se nedenfor) |

### Fund fra den uafhængige gennemgang – alle rettet

1. Handlinger og risikobehandlinger ignorerede den valgte periode → nu dateret og vist fra registreringsdatoen; historisk status udledes.
2. Tab af sidste vidensholder ændrede ikke D2 → tabt viden giver nu genetableringsscore 0.
3. En fratrædelse kunne hæve lederudvikling, og oprykning i scenarier fik automatisk "struktureret onboarding" → ubesatte lederroller tæller 0; oprykning registreres uden onboarding og står som antagelse; sammensætningseffekter forklares på scenariesiden.
4. Fordeling af efterfølgere afhang af rolle-id ved lige kritikalitet → dokumenteret prioritet (fremtidig betydning, tidligste strategiske frist); teksterne præciseret.
5. Overskriften i overblikket var fast pr. status → bygges nu af data.
6. Spring-til-indhold-linket blev tolket af routeren → flytter nu kun fokus.
7. Successionsscenariet fejlede i historiske perioder → parametre gøres gyldige for perioden.
8. Rapporten viste præcision under modellens opløsning og dobbelt punktum → rettet.
9. Fire steder kunne manglende data blive til nul → returnerer nu "ikke vurderet" eller springer over med forklaring.
10. Samme praksisbærer kunne tælles to gange → personer tælles unikt.
11. Ental/flertal og et overløb på 375 px → rettet.

Desuden: risici for "intet nødberedskab" (kandidat først klar om 1–2 år) giver nu moderate risici, så alle fire bånd er i brug; synlig fokusramme i afhængighedsgrafen; CSV-lister adskilles med " | "; praksisrisici på tværs af enheder vises i alle berørte enheder.

## 3. Ikke udført

- Test med skærmlæsere (VoiceOver, NVDA) og i Safari og Firefox.
- En faktisk kørsel af GitHub Actions-workflowet og udgivelse på GitHub Pages (kræver adgang til jeres repository).
- Lighthouse- og ydelsesmålinger.
- Test med virkelige data. Modellen er ikke kalibreret eller valideret.
