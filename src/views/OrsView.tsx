/** Modul A – Organizational Resilience Score™: score, beregning og efterregning. */
import { Fragment, useState } from 'react';
import { DIMENSIONS, INDICATORS, STATUS_TEXT } from '../model/catalog';
import { CURRENT_MODEL, type DimensionId } from '../model/config';
import type { DimensionResult } from '../model/ors';
import type { IndicatorItem } from '../model/indicators';
import { fmtMonth, fmtNumber, fmtPct, fmtScore } from '../lib/format';
import { useRouter } from '../lib/router';
import { useApp } from '../state/AppState';
import { HistoryChart } from '../ui/charts/HistoryChart';
import { CoverageText, ScoreBar } from '../ui/Figures';
import { IconChevron } from '../ui/icons';
import { PageHeader, Panel } from '../ui/Layout';
import { InsufficientData } from '../ui/Overlay';
import { StatusBadge } from '../ui/Status';
import { DataTable } from '../ui/Table';

function ItemRef({ item }: { item: IndicatorItem }) {
  const { openDetail } = useApp();
  const t = item.ref?.type;
  const map = { rolle: 'rolle', kapabilitet: 'kapabilitet', viden: 'viden', praksis: 'praksis' } as const;
  if (t && t in map) {
    return (
      <button type="button" className="link text-left" onClick={() => openDetail(map[t as keyof typeof map], item.ref!.id)}>
        {item.label}
      </button>
    );
  }
  return <span>{item.label}</span>;
}

function DimensionSection({ d, open, onToggle }: { d: DimensionResult; open: boolean; onToggle: () => void }) {
  const doc = DIMENSIONS[d.id];
  const [openInd, setOpenInd] = useState<string | null>(null);
  const bodyId = `dim-${d.id}`;
  return (
    <section className="panel" id={`dimension-${d.id}`}>
      <button type="button" className="flex w-full flex-col gap-3 px-5 py-4 text-left sm:flex-row sm:items-center sm:justify-between" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <span className="min-w-0">
          <span className="font-mono text-2xs text-ink-muted">{d.id}</span>
          <span className="block font-serif text-lg font-semibold leading-snug">{doc.name}</span>
          <span className="block text-2xs text-ink-2">{doc.purpose}</span>
        </span>
        <span className="flex shrink-0 items-center gap-5">
          <span className="w-44">
            <ScoreBar score={d.score} label={doc.name} />
            <span className="mt-1 flex justify-between whitespace-nowrap text-2xs text-ink-muted">
              <span>Vægt {fmtPct(d.weight)}</span>
              <span className="num">Dækning {fmtPct(d.coverage)}</span>
            </span>
          </span>
          <span className="w-28 text-right">
            <span className="num block font-serif text-2xl font-semibold">{fmtScore(d.score)}</span>
            {d.score === null ? <InsufficientData /> : <StatusBadge status={d.status} />}
          </span>
          <IconChevron className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && (
        <div id={bodyId} className="border-t border-rule px-5 py-4">
          {d.score === null && d.rawScore !== null && (
            <p className="mb-3 rounded-sm border border-dashed border-rule-strong px-3 py-2 text-2xs text-ink-2">
              Beregnet værdi {fmtScore(d.rawScore)} vises ikke, fordi datadækningen ({fmtPct(d.coverage)}) er under kravet på {fmtPct(CURRENT_MODEL.minDimensionCoverage)}. Dimensionen udelades, og de øvrige vægte genvægtes.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Indikatorer for {doc.name}</caption>
              <thead>
                <tr>
                  <th className="th">Indikator</th>
                  <th className="th text-right">Værdi</th>
                  <th className="th text-right">Vægt</th>
                  <th className="th text-right">Dækning</th>
                  <th className="th text-right">Obs.</th>
                  <th className="th">
                    <span className="sr-only">Efterregning</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.indicators.map((ind) => {
                  const idoc = INDICATORS[ind.id];
                  const isOpen = openInd === ind.id;
                  return (
                    <Fragment key={ind.id}>
                      <tr>
                        <td className="td">
                          <span className="font-mono text-2xs text-ink-muted">{ind.id}</span> <span className="font-medium">{idoc.name}</span>
                          <span className="block text-2xs text-ink-muted">{idoc.question}</span>
                          {ind.reason && <span className="mt-1 block"><InsufficientData reason={ind.reason} /></span>}
                          {!ind.applicable && <span className="mt-1 block text-2xs text-ink-muted">Ikke relevant i udsnittet – indgår ikke i dækningen.</span>}
                        </td>
                        <td className="td num text-right font-semibold">{fmtScore(ind.value)}</td>
                        <td className="td num text-right text-ink-2">{fmtPct(CURRENT_MODEL.indicatorWeights[ind.id])}</td>
                        <td className="td num text-right text-ink-2">{ind.applicable ? fmtPct(ind.coverage) : '—'}</td>
                        <td className="td num text-right text-ink-2">
                          {ind.nWithData}/{ind.n}
                        </td>
                        <td className="td text-right">
                          {ind.items.length > 0 && (
                            <button type="button" className="link whitespace-nowrap text-2xs" aria-expanded={isOpen} onClick={() => setOpenInd(isOpen ? null : ind.id)}>
                              {isOpen ? 'Skjul' : 'Efterregn'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={6} className="border-b border-rule bg-paper/60 px-3 py-3">
                            <p className="mb-2 font-mono text-2xs text-ink-2">{idoc.formula}</p>
                            <table className="w-full text-2xs">
                              <caption className="sr-only">Observationer for {idoc.name}</caption>
                              <thead>
                                <tr>
                                  <th className="th !py-1">Observation</th>
                                  <th className="th !py-1 text-right">Vægt</th>
                                  <th className="th !py-1 text-right">Værdi</th>
                                  <th className="th !py-1">Grundlag</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ind.items.map((it) => (
                                  <tr key={it.key}>
                                    <td className="td !py-1.5 !text-2xs">
                                      <ItemRef item={it} />
                                    </td>
                                    <td className="td num !py-1.5 text-right !text-2xs">{fmtNumber(it.weight, 1)}</td>
                                    <td className="td num !py-1.5 text-right !text-2xs">{it.value === null ? 'mangler' : fmtNumber(Math.round(it.value))}</td>
                                    <td className="td !py-1.5 !text-2xs text-ink-2">{it.detail}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <p className="mt-2 text-2xs text-ink-muted">Kilder: {idoc.sources.join(' · ')}. {idoc.missing}</p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-2xs text-ink-muted">
            Dimensionsscore = Σ(indikatorvægt × værdi) ÷ Σ indikatorvægt for indikatorer med værdi. {doc.missingData}
          </p>
        </div>
      )}
    </section>
  );
}

function Calculation() {
  const { ors } = useApp();
  const scored = ors.dimensions.filter((d) => d.score !== null);
  const missing = ors.dimensions.filter((d) => d.score === null);
  const sw = scored.reduce((s, d) => s + d.weight, 0);
  const weakest = ors.dimensions.find((d) => d.id === ors.weakestDimension);
  return (
    <Panel eyebrow="Beregning" title="Sådan fremkommer scoren" footnote={`Model v${CURRENT_MODEL.version}: ${CURRENT_MODEL.changeNote}`}>
      <ol className="space-y-3 font-mono text-2xs leading-relaxed text-ink-2 sm:text-sm">
        <li>
          <span className="font-sans font-semibold text-ink">1. Vægtet gennemsnit</span>
          <br />
          ({scored.map((d) => `${fmtNumber(d.weight, 2)} × ${fmtNumber(d.score!, 1)}`).join(' + ')}) ÷ {fmtNumber(sw, 2)} = <strong className="text-ink">{ors.weightedMean === null ? '—' : fmtNumber(ors.weightedMean, 1)}</strong>
        </li>
        <li>
          <span className="font-sans font-semibold text-ink">2. Svaghedsloft</span>
          <br />
          Svageste dimension {weakest ? `${DIMENSIONS[weakest.id].name.toLowerCase()} ${fmtNumber(weakest.score!, 1)}` : '—'} + {CURRENT_MODEL.weaknessCapPoints} = <strong className="text-ink">{ors.cap === null ? '—' : fmtNumber(ors.cap, 1)}</strong>
        </li>
        <li>
          <span className="font-sans font-semibold text-ink">3. ORS</span>
          <br />
          min({ors.weightedMean === null ? '—' : fmtNumber(ors.weightedMean, 1)}; {ors.cap === null ? '—' : fmtNumber(ors.cap, 1)}) = <strong className="text-ink">{ors.score === null ? '—' : fmtNumber(ors.score, 1)}</strong> → vises som <strong className="text-ink">{fmtScore(ors.score)}</strong>
        </li>
      </ol>
      {missing.length > 0 && (
        <p className="mt-4 text-2xs text-ink-2">
          Udeladt pga. utilstrækkeligt datagrundlag: {missing.map((d) => DIMENSIONS[d.id].name).join(', ')}. Dimensioner med score dækker {fmtPct(ors.weightCoverage)} af vægten (krav: mindst {fmtPct(CURRENT_MODEL.minOrsWeightCoverage)}).
        </p>
      )}
      <p className="mt-3 text-2xs text-ink-muted">Scoren vises som heltal. Ændringer under {CURRENT_MODEL.changeResolution} point betragtes som uændrede, fordi modellen ikke kan skelne mindre forskelle forsvarligt.</p>
    </Panel>
  );
}

function Units() {
  const { unitOrs, orsOrg, setUnit, unitId } = useApp();
  type Row = (typeof unitOrs)[number] | { unit: null; ors: typeof orsOrg };
  const rows: Row[] = [{ unit: null, ors: orsOrg }, ...unitOrs];
  return (
    <Panel
      eyebrow="Aggregering"
      title="Enheder"
      bodyClassName="px-2 pb-2"
      footnote={`${(['D1', 'D2', 'D3', 'D4', 'D5', 'D6'] as DimensionId[]).map((id) => `${id} ${DIMENSIONS[id].name.toLowerCase()}`).join(' · ')}. Koncernscoren beregnes direkte på det samlede datagrundlag – den er ikke et gennemsnit af enhedsscorerne, fordi enhederne har forskelligt antal roller, kapabiliteter og vidensområder. Successionsmatchingen sker altid på tværs af hele organisationen, så en kandidat ikke tælles i to enheder.`}
    >
      <DataTable<Row>
        caption="ORS pr. enhed"
        rows={rows}
        rowKey={(r) => r.unit?.id ?? 'alle'}
        onRowClick={(r) => setUnit(r.unit?.id ?? null)}
        rowLabel={(r) => r.unit?.name ?? 'Hele organisationen'}
        columns={[
          {
            key: 'enhed',
            header: 'Enhed',
            render: (r) => (
              <span className={r.unit?.id === unitId || (!r.unit && unitId === null) ? 'font-semibold' : ''}>
                {r.unit?.name ?? 'Hele organisationen'}
                {r.unit?.growthCritical && <span className="ml-2 chip">Vækstkritisk</span>}
              </span>
            ),
            sortValue: (r) => r.unit?.name ?? '',
          },
          { key: 'ors', header: 'ORS', align: 'right', render: (r) => <span className="num font-semibold">{fmtScore(r.ors.score)}</span>, sortValue: (r) => r.ors.score },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.ors.status} /> },
          ...(['D1', 'D2', 'D3', 'D4', 'D5', 'D6'] as DimensionId[]).map((id, i) => ({
            key: id,
            header: <abbr title={DIMENSIONS[id].name} className="no-underline">{id}</abbr>,
            align: 'right' as const,
            render: (r: Row) => <span className="num text-ink-2">{fmtScore(r.ors.dimensions[i]!.score)}</span>,
            sortValue: (r: Row) => r.ors.dimensions[i]!.score,
          })),
          { key: 'dæk', header: 'Dækning', align: 'right', render: (r) => <CoverageText coverage={r.ors.coverage} label="" />, sortValue: (r) => r.ors.coverage },
        ]}
      />
    </Panel>
  );
}

function Quality() {
  const { quality } = useApp();
  return (
    <Panel eyebrow="Datakvalitet" title={`Datakvalitet: ${quality.level === 'høj' ? 'høj' : quality.level === 'middel' ? 'middel' : 'lav'}`} footnote="Datakvalitet er adskilt fra scoren og ændrer den ikke. Den beskriver fuldstændighed, aktualitet og dokumentation – ikke statistisk sikkerhed.">
      <dl className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <dt className="text-2xs text-ink-muted">Datadækning</dt>
          <dd className="num font-semibold">{fmtPct(quality.coverage)}</dd>
        </div>
        <div>
          <dt className="text-2xs text-ink-muted">Aktualitet</dt>
          <dd className="num font-semibold">{fmtPct(quality.freshness)}</dd>
        </div>
        <div>
          <dt className="text-2xs text-ink-muted">Dokumenteret beredskab</dt>
          <dd className="num font-semibold">{quality.documentedShare === null ? '—' : fmtPct(quality.documentedShare)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-2xs text-ink-2">Høj kræver mindst 90 % dækning, 85 % aktualitet og at mindst halvdelen af beredskabsvurderingerne hviler på dokumenteret evidens. Middel kræver 75 % dækning og 60 % aktualitet.</p>
      {quality.stale.length > 0 && (
        <>
          <p className="mt-4 text-2xs font-semibold text-ink">Forældede eller manglende opgørelser</p>
          <ul className="mt-1 space-y-0.5 text-2xs text-ink-2">
            {quality.stale.map((s) => (
              <li key={s.label}>
                {s.label} – {s.detail}
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

export default function OrsView() {
  const { ors, history, asOf, unit } = useApp();
  const { route, setParams } = useRouter();
  const dimParam = route.query.get('dim') as DimensionId | null;
  const [metric, setMetric] = useState<'ors' | DimensionId>('ors');
  const toggle = (id: DimensionId) => setParams({ dim: dimParam === id ? null : id });

  return (
    <div>
      <PageHeader
        eyebrow={`Modul A · ${unit?.name ?? 'Hele organisationen'} · ${fmtMonth(asOf)}`}
        title="Organizational Resilience Score™"
        lede="En forklarlig score fra 0 til 100 for, hvor godt organisationen kan fortsætte og udvikle sig, når mennesker, roller og betingelser ændrer sig. Seks dimensioner, vægtet og begrænset af den svageste."
      />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="panel flex flex-col justify-between p-5 lg:col-span-4">
          <div>
            <p className="eyebrow">Organisatorisk robusthed</p>
            <p className="mt-2 font-serif">
              <span className="num text-6xl font-semibold tracking-[-0.03em]">{fmtScore(ors.score)}</span>
              <span className="ml-1 text-lg text-ink-muted">/100</span>
            </p>
            <div className="mt-2">
              <StatusBadge status={ors.status} size="md" />
            </div>
            <p className="mt-3 text-sm text-ink-2">{STATUS_TEXT[ors.status]}</p>
          </div>
          <p className="mt-4 text-2xs text-ink-muted">
            Statusgrænser: Robust ≥ {CURRENT_MODEL.thresholds.robust} · Tilstrækkelig {CURRENT_MODEL.thresholds.tilstrækkelig}–{CURRENT_MODEL.thresholds.robust - 1} · Sårbar {CURRENT_MODEL.thresholds.sårbar}–{CURRENT_MODEL.thresholds.tilstrækkelig - 1} · Kritisk under {CURRENT_MODEL.thresholds.sårbar}. Grænserne er prototype-antagelser, der skal kalibreres.
          </p>
        </div>
        <div className="lg:col-span-8">
          <Calculation />
        </div>
      </div>

      <h2 className="mb-3 mt-10 font-serif text-xl font-semibold">Seks dimensioner</h2>
      <div className="space-y-3">
        {ors.dimensions.map((d) => (
          <DimensionSection key={d.id} d={d} open={dimParam === d.id} onToggle={() => toggle(d.id)} />
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel
            eyebrow="Historik"
            title="Udvikling over tid"
            actions={
              <select className="field" aria-label="Vælg serie" value={metric} onChange={(e) => setMetric(e.target.value as 'ors' | DimensionId)}>
                <option value="ors">ORS samlet</option>
                {(['D1', 'D2', 'D3', 'D4', 'D5', 'D6'] as DimensionId[]).map((id) => (
                  <option key={id} value={id}>
                    {DIMENSIONS[id].name}
                  </option>
                ))}
              </select>
            }
          >
            <HistoryChart history={history} metric={metric} label={metric === 'ors' ? 'ORS pr. måned' : `${DIMENSIONS[metric].name} pr. måned`} selectedDate={asOf} />
          </Panel>
        </div>
        <div className="lg:col-span-5">
          <Quality />
        </div>
      </div>

      <div className="mt-6">
        <Units />
      </div>
    </div>
  );
}
