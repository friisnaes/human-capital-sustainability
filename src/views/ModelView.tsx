import type { ReactNode } from 'react';
/** Modelkatalog – formler, input, vægte, tærskler, antagelser, begrænsninger og eksempler. */
import { DIMENSIONS, INDICATORS } from '../model/catalog';
import { CRITICALITY, CURRENT_MODEL, MIN_N, MODEL_VERSIONS, NORMALIZATION, RISK_MODEL, SCENARIO, WINDOWS, type DimensionId, type IndicatorId } from '../model/config';
import { DIMENSION_INDICATORS } from '../model/ors';
import { MATRIX_THRESHOLDS } from '../model/matrix';
import { topDistinctRisks } from '../model/risk';
import { fmtDate, fmtNumber, fmtPct, fmtScore } from '../lib/format';
import { useApp } from '../state/AppState';
import { DefList, PageHeader, Panel } from '../ui/Layout';

const DIMS: DimensionId[] = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'];

function Toc() {
  const items: [string, string][] = [
    ['versioner', 'Modelversioner'],
    ['principper', 'Principper'],
    ['ors', 'ORS-formlen'],
    ['dimensioner', 'Dimensioner og indikatorer'],
    ['taerskler', 'Tærskler og normalisering'],
    ['succession', 'Succession og beredskab'],
    ['risiko', 'Risikomodel'],
    ['matrix', 'Future Value Matrix™'],
    ['scenarier', 'Scenarier'],
    ['eksempel', 'Gennemregnede eksempler'],
    ['begraensninger', 'Antagelser og begrænsninger'],
  ];
  return (
    <nav aria-label="Indhold i modelkataloget" className="panel p-4 text-sm lg:sticky lg:top-24">
      <p className="eyebrow mb-2">Indhold</p>
      <ol className="space-y-1">
        {items.map(([id, label], i) => (
          <li key={id}>
            <button
              type="button"
              className="link text-left"
              onClick={() => {
                const el = document.getElementById(id);
                el?.scrollIntoView({ behavior: 'smooth' });
                el?.focus({ preventScroll: true });
              }}
            >
              <span className="num mr-1 text-ink-muted">{i + 1}.</span>
              {label}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function H({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} tabIndex={-1} className="mb-3 mt-10 scroll-mt-28 font-serif text-xl font-semibold first:mt-0 focus:outline-none">
      {children}
    </h2>
  );
}

export default function ModelView() {
  const { ors, risks, asOf } = useApp();
  const top = topDistinctRisks(risks, 1)[0];
  const scored = ors.dimensions.filter((d) => d.score !== null);
  const sw = scored.reduce((s, d) => s + d.weight, 0);

  return (
    <div>
      <PageHeader
        eyebrow={`Dokumentation · ORS v${CURRENT_MODEL.version} · risikomodel v${RISK_MODEL.version}`}
        title="Modelkatalog"
        lede="Alle formler, input, vægte og tærskler, der bruges i platformen – med begrundelser, antagelser og begrænsninger. Tallene i dette katalog læses direkte fra den kode, der beregner scorerne."
      />
      <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
        <div className="no-print">
          <Toc />
        </div>
        <div className="min-w-0 max-w-4xl">
          <H id="versioner">1. Modelversioner</H>
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Modelversioner</caption>
              <thead>
                <tr>
                  <th className="th">Version</th>
                  <th className="th">Gyldig fra</th>
                  <th className="th">Ændring</th>
                </tr>
              </thead>
              <tbody>
                {MODEL_VERSIONS.map((m) => (
                  <tr key={m.version}>
                    <td className="td font-mono">ORS {m.version}{m.version === CURRENT_MODEL.version ? ' (gældende)' : ''}</td>
                    <td className="td num">{fmtDate(m.validFrom)}</td>
                    <td className="td">{m.changeNote}</td>
                  </tr>
                ))}
                <tr>
                  <td className="td font-mono">Risiko {RISK_MODEL.version}</td>
                  <td className="td num">{fmtDate(MODEL_VERSIONS[0]!.validFrom)}</td>
                  <td className="td">Prioritet ud fra konsekvens, eksponering og beredskab; sandsynlighed vises separat.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-2xs text-ink-muted">Historiske perioder vises både med den model, der var gældende (rapporteret), og genberegnet med den gældende model, så sammenligninger sker på samme grundlag.</p>

          <H id="principper">2. Principper</H>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
            <li><strong>Manglende data bliver aldrig til nul.</strong> Observationer uden data udelades af gennemsnittet og trækker datadækningen ned.</li>
            <li><strong>Lav datadækning er synlig.</strong> En dimension vises kun, når dækningen er mindst {fmtPct(CURRENT_MODEL.minDimensionCoverage)}; ORS vises kun, når dimensioner med score udgør mindst {fmtPct(CURRENT_MODEL.minOrsWeightCoverage)} af vægten. Ellers vises "utilstrækkeligt datagrundlag".</li>
            <li><strong>Score og datakvalitet holdes adskilt.</strong> Datakvalitet (dækning, aktualitet, dokumentation) ændrer ikke scoren og er ikke et udtryk for statistisk sikkerhed.</li>
            <li><strong>Aggregering er eksplicit.</strong> Koncernscoren beregnes på det samlede datagrundlag – ikke som gennemsnit af enhedsscorer. Successionsmatching sker altid på tværs af hele organisationen.</li>
            <li><strong>Ingen dobbelttælling uden forklaring.</strong> Samme efterfølger kan kun dække ét behov. Risici med samme rod markeres som relaterede og tælles kun én gang i overblikket.</li>
            <li><strong>Ingen falsk præcision.</strong> Scorer vises som heltal; ændringer under {CURRENT_MODEL.changeResolution} point vises som uændrede.</li>
            <li><strong>Ingen påstande om validering eller kausalitet.</strong> Modellen er en forklarlig prototype til beslutningsstøtte. Vægte og tærskler er faglige antagelser, der skal kalibreres med virkelige data. Der bruges ingen branchebenchmarks.</li>
            <li><strong>Mennesker rangeres ikke.</strong> Individuel afgangssandsynlighed udledes aldrig; afgang simuleres kun som eksplicit antagelse.</li>
          </ul>

          <H id="ors">3. ORS-formlen</H>
          <Panel>
            <p className="font-mono text-sm leading-relaxed">
              Vægtet gennemsnit = Σ(vægt<sub>d</sub> × score<sub>d</sub>) ÷ Σ vægt<sub>d</sub> (kun dimensioner med score)
              <br />
              ORS = min(vægtet gennemsnit; svageste dimension + {CURRENT_MODEL.weaknessCapPoints})
            </p>
            <p className="mt-3 text-sm text-ink-2">
              Svaghedsloftet (indført i v1.1) sikrer, at en høj gennemsnitsscore ikke skjuler en alvorlig enkeltstående svaghed: er én dimension på 20, kan ORS højst blive 50 uanset de øvrige dimensioner. Ved siden af scoren vises antallet af kritiske enkeltpersonsafhængigheder, så de ikke forsvinder i et gennemsnit.
            </p>
            <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Dimensionsvægte</caption>
              <thead>
                <tr>
                  <th className="th !px-0">Dimension</th>
                  <th className="th text-right">Vægt</th>
                  <th className="th !pr-0">Begrundelse</th>
                </tr>
              </thead>
              <tbody>
                {DIMS.map((d) => (
                  <tr key={d}>
                    <td className="td !px-0">{DIMENSIONS[d].name}</td>
                    <td className="td num text-right">{fmtPct(CURRENT_MODEL.dimensionWeights[d])}</td>
                    <td className="td !pr-0 text-2xs text-ink-2">{DIMENSIONS[d].weightRationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Panel>

          <H id="dimensioner">4. Dimensioner og indikatorer</H>
          <div className="space-y-6">
            {DIMS.map((d) => (
              <Panel key={d} eyebrow={`${d} · vægt ${fmtPct(CURRENT_MODEL.dimensionWeights[d])}`} title={DIMENSIONS[d].name}>
                <p className="text-sm">{DIMENSIONS[d].purpose}</p>
                <p className="mt-1 text-2xs text-ink-2">Manglende data: {DIMENSIONS[d].missingData}</p>
                <div className="mt-4 space-y-4">
                  {DIMENSION_INDICATORS[d].map((iid: IndicatorId) => {
                    const doc = INDICATORS[iid];
                    return (
                      <div key={iid} className="border-t border-rule pt-3">
                        <p className="text-sm font-semibold">
                          <span className="font-mono text-ink-muted">{iid}</span> {doc.name}{' '}
                          <span className="font-normal text-ink-muted">· {fmtPct(CURRENT_MODEL.indicatorWeights[iid])} af dimensionen</span>
                        </p>
                        <p className="mt-1 rounded-sm bg-paper px-2 py-1 font-mono text-2xs text-ink-2">{doc.formula}</p>
                        <DefList
                          className="mt-2 !text-2xs"
                          items={[
                            ['Input og enhed', doc.unit],
                            ['Datakilder', doc.sources.join(' · ')],
                            ['Normalisering', doc.normalization],
                            ['Manglende data', `${doc.missing}${iid in MIN_N ? ` Minimum ${MIN_N[iid as keyof typeof MIN_N]} observationer.` : ''}`],
                            ['Vægt', doc.weightRationale],
                          ]}
                        />
                      </div>
                    );
                  })}
                </div>
              </Panel>
            ))}
          </div>

          <H id="taerskler">5. Tærskler og normalisering</H>
          <Panel>
            <DefList
              items={[
                ['Robust', `≥ ${CURRENT_MODEL.thresholds.robust}: organisationen kan bære tab af enkeltpersoner uden væsentlig forsinkelse af strategien.`],
                ['Tilstrækkelig', `${CURRENT_MODEL.thresholds.tilstrækkelig}–${CURRENT_MODEL.thresholds.robust - 1}: grundlæggende bæreevne med afgrænsede sårbarheder.`],
                ['Sårbar', `${CURRENT_MODEL.thresholds.sårbar}–${CURRENT_MODEL.thresholds.tilstrækkelig - 1}: væsentlige afhængigheder.`],
                ['Kritisk', `< ${CURRENT_MODEL.thresholds.sårbar}: strategien hviler på få personer eller kapabiliteter uden backup.`],
                ['Begrundelse', 'Tærsklerne deler skalaen, så "robust" kræver tre fjerdedele af den mulige score, og "kritisk" svarer til, at mindre end halvdelen er på plads. De er prototype-antagelser, der skal kalibreres.'],
                ['Klassifikation', 'Scoren afrundes til heltal, før status bestemmes, så tal og status altid stemmer overens.'],
                ['Kritisk rolle', `Kritikalitet ≥ ${CRITICALITY.criticalRole}`],
                ['Kritisk viden', `Kritikalitet ≥ ${CRITICALITY.knowledgeInScope} indgår i D2; ≥ ${CRITICALITY.criticalKnowledge} kan udløse risici`],
                ['Strategisk kapabilitet', `Fremtidig betydning ≥ ${CRITICALITY.strategicCapability}`],
                ['Backup', 'Kvalificerede holdere: 0–1 = 0, 2 = 60, 3+ = 100'],
                ['Dokumentation', `Niveau 0–3 = ${NORMALIZATION.documentation.join(' / ')}`],
                ['Genetablering', `Faktor ${NORMALIZATION.docRebuildFactor.map((f) => fmtNumber(f, 2)).join(' / ')} pr. dokumentationsniveau; ${NORMALIZATION.rebuildWithBackupMonths} mdr. med backup; score lineær fra ${NORMALIZATION.rebuildBestMonths} (100) til ${NORMALIZATION.rebuildWorstMonths} mdr. (0)`],
                ['Tidsvinduer', `Evidens ${WINDOWS.evidenceMonths} mdr. · progression ${WINDOWS.progressionMonths} mdr. · onboarding ${WINDOWS.onboardingMonths} mdr. · milepæle ${WINDOWS.milestoneMonths} mdr. · mobilitet ${WINDOWS.mobilityMonths} mdr.`],
                ['Aktualitet', `Kapacitet og gennemførelse højst ${NORMALIZATION.capacityMaxAgeMonths} mdr.; successionsreview højst ${WINDOWS.planReviewMaxAgeMonths} mdr.; dokumentationsvurdering højst ${WINDOWS.docAssessmentMaxAgeMonths} mdr.`],
              ]}
            />
          </Panel>

          <H id="succession">6. Succession og beredskab</H>
          <Panel>
            <DefList
              items={[
                ['Klar nu', 'Kan overtage rollen nu med normal introduktion.'],
                ['1–2 år', 'Forventes klar inden for 1–2 år med planlagt udvikling. Tæller som dækning i D3.'],
                ['3–5 år', 'Forventes klar inden for 3–5 år. Tæller ikke som dækning.'],
                ['Dokumenteret evidens', 'Vurderingen henviser til registrerede udviklingsforløb, uddelegeret ansvar, leverancer eller certificeringer med kilde og dato.'],
                ['Menneskelig vurdering', 'Ledelsens skøn uden registreret evidens. Tæller med, men sænker datakvaliteten.'],
                ['Effektiv dækning', 'Kandidater fordeles med en prioriteret matching (Kuhns algoritme). Prioritet: 1) kritikalitet, 2) højeste fremtidige betydning blandt rollens kapabiliteter, 3) tidligste frist i de strategiske mål, rollen bidrager til, 4) rolle-id som sidste udvej. En allerede dækket rolle mister aldrig dækning til en lavere prioriteret. Hver kandidat dækker højst ét behov.'],
                ['Manglende plan', 'En kritisk rolle uden registreret plan er manglende data – ikke nul.'],
                ['Ubesat lederrolle', 'Tæller som 0 i "ledere, der udvikler efterfølgere": ingen leder udvikler efterfølgere i rollen.'],
                ['Behandling og handlinger', 'Ledelsens risikobehandling og handlinger vises fra den dato, de blev registreret. Historisk status udledes af start og frist.'],
              ]}
            />
          </Panel>

          <H id="risiko">7. Risikomodel</H>
          <Panel>
            <p className="rounded-sm bg-paper px-2 py-1 font-mono text-sm">Prioritet = 100 × K × E × (6 − B) ÷ 125</p>
            <DefList
              className="mt-3"
              items={[
                ['K – konsekvens', 'Successionsgab: (rollens kritikalitet + højeste fremtidige betydning) ÷ 2. Viden: (kritikalitet + fremtidig betydning) ÷ 2. Kapacitet: fremtidig betydning. Praksis: betydning − 1 (indirekte effekt).'],
                ['E – eksponering', 'Successionsgab: ubesat eller ingen kandidater = 5, kun 3–5 år eller ingen plan = 4, kandidat dobbeltbooket = 3, dækket inden for 2 år men ingen klar nu (intet nødberedskab) = 2. Viden: én holder og basistid ≥ 12 mdr. = 5, 6–11 = 4, under 6 = 3; ingen holdere = 5. Kapacitet: dækning under 50 % = 5, under 65 % = 4, under 80 % = 3. Praksis: én bærer = 4, ingen = 5.'],
                ['B – beredskab', 'Starter på 1 og øges for virksomme foranstaltninger: kandidat klar nu, dokumenteret viden, delt viden, dokumenteret udvikling, personer under oplæring, omstillingsforløb, lukning af gab, formel ejer, stabil gennemførelse. Højst 5.'],
                ['Bånd', `Kritisk ≥ ${RISK_MODEL.bands.kritisk} · Høj ≥ ${RISK_MODEL.bands.høj} · Moderat ≥ ${RISK_MODEL.bands.moderat} · Lav under ${RISK_MODEL.bands.moderat}`],
                ['Sandsynlighed', 'Vises kun, når en navngiven rolle har vurderet den for en organisatorisk hændelse. Indgår ikke i prioriteten. Bruges aldrig om enkeltpersoners afgang.'],
                ['Tidshorisont', `Tid til næste ikke-gennemførte milepæl i de berørte mål: ≤ ${RISK_MODEL.horizonMonths.kort} mdr. = kort, ≤ ${RISK_MODEL.horizonMonths.mellem} mdr. = mellemlang, ellers lang.`],
                ['Rod', 'Den person eller kapabilitet, risikoen udspringer af. Risici med samme rod er relaterede og tælles én gang i overblikket.'],
              ]}
            />
          </Panel>

          <H id="matrix">8. Future Value Matrix™</H>
          <Panel>
            <DefList
              items={[
                ['X-akse', 'Direktionens vurdering af fremtidig betydning (1–5). For roller: højeste betydning blandt rollens kapabiliteter.'],
                ['Y-akse', 'Gennemsnit af tilgængelige komponenter, højst svageste komponent + 30. Kapabiliteter: kapacitetsdækning, svageste vidensområdes robusthed, effektiv succession. Roller: succession, indehaverens videnrobusthed, besættelse.'],
                ['Feltgrænser', `Høj betydning fra ${fmtNumber(MATRIX_THRESHOLDS.importance, 1)}; tilstrækkeligt beredskab fra ${MATRIX_THRESHOLDS.readiness}.`],
                ['Anbefaling', `Høj betydning og lavt beredskab: opbyg kapacitet, hvis kapacitetsdækningen er under ${MATRIX_THRESHOLDS.capacityFirst} %; ellers peger anbefalingen på svageste komponent (viden → beskyt kritisk viden, succession → styrk succession). Lav betydning og højt beredskab: omstil eksisterende kapabilitet.`],
                ['Personer', 'Matrixen viser ikke personer. Rollevisningen viser roller, ikke mennesker.'],
              ]}
            />
          </Panel>

          <H id="scenarier">9. Scenarier</H>
          <Panel>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>Scenarier anvendes på en kopi af data på analysedatoen og beregnes med samme model. Grunddata ændres aldrig.</li>
              <li>Utilgængelig person: ansættelse, roller, vidensholdning, kandidatur og praksisbæring ophører; én kapabilitet mister ét årsværk. Valgfrit rykker efterfølgere, der er klar nu, op – og efterlader deres egen rolle ledig.</li>
              <li>Genetableringstid: ubesat rolle = rekruttering + indkøring (eller {SCENARIO.readySuccessorMonths} mdr., hvis en efterfølger er klar nu); tabt viden = basistid × dokumentationsfaktor. Den samlede tid er det længste enkeltbehov.</li>
              <li>Handlingers forventede effekt beregnes på samme måde ud fra handlingens registrerede ændringer.</li>
            </ul>
          </Panel>

          <H id="eksempel">10. Gennemregnede eksempler</H>
          <Panel eyebrow="Eksempel A · kontrolleret testdatasæt (også brugt i de automatiske tests)" title="Svaghedsloftet i praksis">
            <DefList
              items={[
                ['D1', 'I1.1 = (5 × 70 + 3 × 100) ÷ 8 = 81,25; I1.2 = 100; D1 = 0,65 × 81,25 + 0,35 × 100 = 87,8'],
                ['D2', 'I2.1 = 26,7; I2.2 = 63,9; I2.3 = 71,5; D2 = 0,45 × 26,7 + 0,30 × 63,9 + 0,25 × 71,5 = 49,0'],
                ['D3', 'Samme kandidat til to roller → kun den mest kritiske dækkes. I3.1 = 55,6; I3.2 = 44,4; rolle uden plan giver dækning 69 %. D3 = 51,1'],
                ['D4', 'Ingen kandidater i dokumenteret udvikling → 0 (progression udelades: under 3 observationer)'],
                ['D5', 'Ingen praksisdata → dækning 25 % → utilstrækkeligt datagrundlag, udeladt'],
                ['D6', 'Gab halveret → 100; én af to milepæle rettidig → 50; D6 = (0,40 × 100 + 0,35 × 50) ÷ 0,75 = 76,7'],
                ['ORS', 'Vægtet gennemsnit af D1–D4 og D6 = 54,5; loft = 0 + 30 = 30; ORS = min(54,5; 30) = 30 (kritisk). Under model 1.0 ville scoren have været 54,5.'],
              ]}
            />
          </Panel>
          <Panel className="mt-4" eyebrow={`Eksempel B · demonstrationsdata, ${fmtDate(asOf)}`} title="Den aktuelle score efterregnet">
            <p className="font-mono text-2xs leading-relaxed text-ink-2">
              ({scored.map((d) => `${fmtNumber(d.weight, 2)} × ${fmtNumber(d.score!, 1)}`).join(' + ')}) ÷ {fmtNumber(sw, 2)} = {ors.weightedMean === null ? '—' : fmtNumber(ors.weightedMean, 1)}; loft {ors.cap === null ? '—' : fmtNumber(ors.cap, 1)}; ORS = {fmtScore(ors.score)}
            </p>
            {top && (
              <p className="mt-3 font-mono text-2xs leading-relaxed text-ink-2">
                Højest prioriterede risiko ({top.id}): 100 × {top.consequence.value} × {top.exposure.value} × (6 − {top.readiness.value}) ÷ 125 = {top.priority}
              </p>
            )}
          </Panel>

          <H id="begraensninger">11. Antagelser og begrænsninger</H>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
            <li>Vægte, tærskler og normaliseringer er faglige prototype-antagelser. De er ikke empirisk kalibreret eller valideret og skal testes mod virkelige forløb.</li>
            <li>Modellen beskriver sårbarhed – ikke årsagssammenhænge. En lav score viser, hvor organisationen er afhængig, ikke hvorfor.</li>
            <li>Mange input er menneskelige vurderinger (fremtidig betydning, beredskab, dokumentationsniveau). Kvaliteten afhænger af, hvor ærligt og ensartet de afgives.</li>
            <li>Kapacitet måles i årsværk fra ressourceplanen; kompetenceniveau inden for årsværkene indgår ikke.</li>
            <li>Kulturelle forhold måles kun som praksis og infrastruktur. Holdninger, trivsel og tillid indgår ikke.</li>
            <li>Ændringer under {CURRENT_MODEL.changeResolution} point bør ikke tolkes som reelle ændringer.</li>
            <li>Flere indikatorer er andele. Når en person uden registreret udvikling forlader kandidatpuljen, kan en andel stige uden reel forbedring. Scenariesiden markerer sådanne stigninger.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
