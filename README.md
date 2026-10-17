# Human Capital Sustainability™

**Executive intelligence-platform for organisatorisk robusthed – med Organizational Resilience Score™ (ORS) som flagskibsmetric.**

Platformen gør organisationens fremtidige bæreevne synlig: Hvor er virksomheden sårbar, hvilke roller, kapabiliteter og nøglepersoner bærer forretningen, hvor mangler succession, og hvad sker der, hvis kritisk viden eller centrale personer forsvinder? Hvert dashboard forbinder **observation → forretningskonsekvens → evidens → anbefalet handling**.

> **Demonstration med fiktive data.** Halbjerg Flowteknik A/S er en opdigtet virksomhed. Versionen her er en statisk, interaktiv demonstration til GitHub Pages – uden login, uden database og uden sikker opbevaring af persondata. Den må ikke bruges med virkelige personoplysninger.

## Indhold

| Område | Rute | Indhold |
|---|---|---|
| Direktionsoverblik | `#/` | ORS, udvikling, dimensionernes bidrag, tre væsentligste sårbarheder, eksponerede mål, nøglepersonsscenarie, prioriterede handlinger |
| Organizational Resilience Score™ | `#/ors` | Beregning trin for trin, seks dimensioner med efterregning af hver observation, enheder, datakvalitet, historik |
| Future Value Matrix™ | `#/matrix` | Fremtidig betydning mod beredskab for kapabiliteter eller roller, anbefalinger, tabelvisning |
| Strategic Dependency Mapper™ | `#/afhaengigheder` | Mål → kapabiliteter → roller → personer → viden, filtre, graf og tabel |
| Leadership Pipeline Engine™ | `#/pipeline` | Kritiske roller, efterfølgere, effektiv dækning, dobbeltbooking, ledere der udvikler ledere |
| Culture Infrastructure Map™ | `#/kultur` | Praksisser pr. kategori og enhed, forankring, kulturbærere, onboarding |
| Human Capital Risk Dashboard™ | `#/risici` | Prioriteret risikoregister med filtre, sortering, risikokort og CSV-eksport |
| Scenariesimulering | `#/scenarier` | Fem scenarietyper beregnet med samme model på en kopi af data |
| Handlingsplan | `#/handlinger` | Ansvar, frist, status og beregnet effekt pr. handling og samlet |
| Modelkatalog | `#/model` | Formler, vægte, tærskler, antagelser, begrænsninger og gennemregnede eksempler |
| Bestyrelsesrapport | `#/rapport` | Printvenlig rapport, der kan gemmes som PDF via browseren |
| Om demonstrationen | `#/om` | Fiktive data, begrænsninger, nulstilling af lokalt gemte valg |

Detaljer for risici, roller, kapabiliteter, vidensområder, praksisser og handlinger åbnes i en sideskuffe (`?vis=risiko:VID-K01`) og kan linkes direkte.

## Lokal opstart

Kræver Node.js 20 eller nyere.

```bash
npm install
npm run dev          # udviklingsserver på http://localhost:5173
```

## Kontroller

```bash
npm run typecheck    # TypeScript i strict mode
npm test             # enhedstests af modeller, data og eksport (Vitest)
npm run build        # typecheck + produktionsbuild til dist/
npm run e2e          # brugerforløb i Chromium på desktop, tablet og mobil (Playwright)
npm run docs:model   # genererer docs/MODELKATALOG.md fra koden
```

Til visuel kontrol findes `scripts/shots.mjs` (skærmbilleder, overløb og konsolfejl pr. side og bredde) og `scripts/overflow.mjs` (finder elementer, der giver vandret rulning). Begge forudsætter, at `vite preview` kører på port 4173.

`npm run e2e` bygger selv applikationen med base path `/human-capital-sustainability/` og starter `vite preview`. Første gang skal browseren installeres: `npx playwright install chromium`.

## Udgivelse på GitHub Pages

1. Opret et repository på GitHub (fx `human-capital-sustainability`) og push koden til grenen `main`.
2. Gå til **Settings → Pages** og vælg **Source: GitHub Actions**.
3. Workflowet `.github/workflows/deploy.yml` kører ved hvert push til `main`: installation, typecheck, tests, build og udgivelse.
4. Siden ligger derefter på `https://<bruger>.github.io/<repository>/`.

**Base path:** Workflowet sætter `BASE_PATH=/<repository-navn>/`, så alle filer hentes fra den rigtige undermappe – også hvis repositoryet omdøbes. Lokalt og i andre statiske miljøer bruges en relativ base (`./`).

**Routing:** Applikationen bruger hash-routing (`#/risici?enhed=DIG`). GitHub Pages leverer altid `index.html`, og resten af adressen håndteres i browseren. Derfor virker direkte links og genindlæsning på alle sider uden en særlig 404-side.

## Arkitektur i korte træk

```
src/
  domain/        domænetyper (organisation, rolle, person, viden, succession, risiko …)
  data/          fiktive demodata, validering, dataadgang og scenarieskabeloner
  model/         rene beregningsfunktioner: ORS, indikatorer, succession, viden,
                 risiko, matrix, afhængigheder, scenarier, historik, datakvalitet
  state/         globale filtre i adressen og delte, memoiserede beregninger
  ui/            fælles komponenter (paneler, tabeller, dialog, status, diagrammer)
  views/         modulvisninger og detaljevisninger
  export/        CSV-eksport
  lib/           routing, dansk formatering, lokal lagring
e2e/             Playwright-tests af de centrale brugerforløb
db/schema.sql    SQL-skema til den fremtidige produktionsløsning (kører ikke på Pages)
docs/            arkitektur, datamodel, modelkatalog, testrapport, begrænsninger
```

Beregningsmodellerne er uafhængige af brugerfladen. Alle sider læser fra de samme beregninger, så overblik, detaljer, rapport og eksport altid viser samme tal. Se [docs/ARKITEKTUR.md](docs/ARKITEKTUR.md).

## Dokumentation

- [Arkitektur og fremtidig produktionsarkitektur](docs/ARKITEKTUR.md)
- [Datamodel](docs/DATAMODEL.md) og [SQL-skema](db/schema.sql)
- [Modelkatalog: scores, risici og succession](docs/MODELKATALOG.md)
- [Testrapport: faktisk udførte kontroller](docs/TESTRAPPORT.md)
- [Begrænsninger og skridt før brug med virkelige persondata](docs/BEGRAENSNINGER.md)

## Afhængigheder

Kun React, React DOM og tre indlejrede skrifttyper (Source Serif 4, IBM Plex Sans, IBM Plex Mono via Fontsource) i produktion. Diagrammer er håndtegnet i SVG. Ingen eksterne kald ved kørsel.
