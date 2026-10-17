# Arkitektur

## 1. Demonstrationen (GitHub Pages)

Demonstrationen er en statisk enkeltsideapplikation bygget med Vite, React 18, TypeScript (strict) og Tailwind CSS.

```
index.html ─► main.tsx ─► App
                           ├─ RouterProvider      hash-routing (#/sti?parametre)
                           ├─ DataGate            indlæser og validerer datagrundlaget (repository.ts)
                           └─ AppProvider         globale filtre + delte beregninger
                                ├─ Shell          navigation, filtre, demomarkering
                                ├─ Moduler        lazy-loadede visninger (views/*)
                                └─ DetailHost     sideskuffe for ?vis=type:id
```

### Lag

| Lag | Mappe | Ansvar |
|---|---|---|
| Domænetyper | `src/domain` | Entiteter og værdityper. Ingen logik. |
| Demodata | `src/data/demo` | Fiktivt, dateret datasæt for én organisation. |
| Dataadgang | `src/data/repository.ts`, `validate.ts` | Indlæser og validerer data. I produktion erstattes indlæsningen af et API-kald. |
| Beregningsmodeller | `src/model` | Rene funktioner uden afhængighed af UI: tidsopslag (`context`), indikatorer, ORS, succession (matching), viden, risiko, matrix, afhængigheder, scenarier, historik, datakvalitet. Konfiguration og versioner i `config.ts`; tekster i `catalog.ts`. |
| Tilstand | `src/state` | Globale filtre ligger i adressen. `AppProvider` beregner analysen én gang pr. filterkombination og deler den. |
| Fælles UI | `src/ui` | Paneler, tabel, dialog, statusmarkeringer, diagrammer (SVG). |
| Modulvisninger | `src/views` | Ét modul pr. fil + detaljevisninger. |
| Eksport og rapport | `src/export`, `views/ReportView.tsx` | CSV med demomarkering; printvenlig rapport. |

### Beregningsflow

1. `createAnalysis(data, dato)` bygger opslag for datoen og beregner successionsmatching og videnanalyse.
2. `computeOrs(analysis, enhed, model)` beregner 17 indikatorer → 6 dimensioner → ORS.
3. `computeRisks(analysis)` udleder risici deterministisk fra samme analyse.
4. `computeHistory` gentager 1–2 for hver månedsultimo med både gældende og daværende modelversion.
5. `runScenario(data, ændringer, dato, enhed)` anvender ændringer på en dyb kopi og kører 1–3 igen.

Fordi alt beregnes fra de daterede grunddata, kan ingen side vise tal, der modsiger en anden.

### Routing og base path

- Hash-routing betyder, at serveren kun skal levere `index.html`. Direkte links og genindlæsning virker på GitHub Pages uden 404-trick.
- Globale filtre (`enhed`, `periode`) bevares ved navigation. Modulfiltre (fx `bånd`, `mål`) og detaljer (`vis`) ligger også i adressen og kan deles.
- Byggets base path styres af miljøvariablen `BASE_PATH` (sættes af workflowet til `/<repository>/`); standard er `./`.

### Lokal lagring

Kun senest anvendte scenarie gemmes i `localStorage` under præfikset `hcs-demo:`. Alle kald er beskyttet med try/catch. Siden **Om demonstrationen** og knappen **Nulstil scenarie** rydder lagringen.

### Tilgængelighed

Semantiske landemærker, spring-til-indhold-link, synligt fokus, tastaturbetjente rækker og diagrampunkter, dialog med fokusfælde og Esc, tekstlige alternativer (tabelvisning til matrix, graf og historik), status kommunikeret med form og tekst – ikke kun farve.

## 2. Fremtidig produktionsarkitektur

> Intet af det følgende er implementeret i demonstrationen.

```
 Browser (samme React-app)
     │  HTTPS, OIDC-token
     ▼
 API-gateway ──► Backend (fx Node/TypeScript eller .NET)
                   ├─ Autentificering: OIDC/SAML mod kundens identitetsudbyder (MFA)
                   ├─ Autorisation: roller + enhedsafgrænsning + RLS i databasen
                   ├─ Beregningsservice: samme model-kode (src/model) kørt på serveren
                   ├─ Snapshot-job: månedlige score-snapshots med datafingeraftryk
                   ├─ Integrationer: HR-system, ressourceplan, kalender (aggregeret)
                   └─ Auditlog: alle læsninger af persondata, ændringer og eksporter
                   │
                   ▼
              PostgreSQL (db/schema.sql) – krypteret i hvile, backup, EU-region
```

### Roller og adgang

| Rolle | Adgang |
|---|---|
| Bestyrelse | Aggregerede scorer, risici og rapport. Personnavne kun hvor nødvendigt for risici med høj prioritet. |
| Direktion | Alle moduler for hele organisationen. |
| Enhedsleder | Egen enhed; personoplysninger kun for egne roller og kandidater. |
| HR-analytiker | Vedligeholdelse af succession, evidens og vurderinger. |
| Administrator | Brugere, integrationer og modelkonfiguration (ingen adgang til persondata uden særskilt rolle). |
| Revisor | Læseadgang til auditlog og modelversioner. |

### Databeskyttelse

- Dataminimering: kun rolle, ansættelsesperiode, dokumenteret evidens og daterede vurderinger. Ingen alder, helbred, private forhold, beskedindhold eller adfærdsdata.
- Formål, retsgrundlag og konsekvensanalyse (DPIA) før idriftsættelse; information til medarbejdere; inddragelse af medarbejderrepræsentanter.
- Sletning og anonymisering efter fastsatte frister; historiske snapshots gemmes aggregeret.
- Kryptering i transit (TLS) og i hvile; hemmeligheder i en nøglehvælving; ingen nøgler i frontend.
- Auditlog er append-only og omfatter eksport.

### Modelstyring

- Hver ændring af vægte, tærskler eller indikatorer udgives som ny `model_version` med godkendelse.
- Snapshots gemmer modelversion og datafingeraftryk, så historiske tal kan genberegnes og efterprøves.
- Kalibrering og validering mod virkelige forløb, før scoren bruges som styringsmål.
