/** Modul B – Future Value Matrix™: fremtidig betydning mod organisatorisk beredskab. */
import { useMemo, useRef, useState } from 'react';
import { capabilityPoints, type MatrixPoint, MATRIX_THRESHOLDS, QUADRANT_LABEL, QUADRANT_TEXT, type Quadrant, rolePoints } from '../model/matrix';
import { fmtMonth, fmtNumber, fmtScore } from '../lib/format';
import { useRouter } from '../lib/router';
import { useApp, useLookup } from '../state/AppState';
import { useWidth } from '../ui/charts/useWidth';
import { PageHeader, Panel } from '../ui/Layout';
import { EmptyState, Segmented } from '../ui/Overlay';
import { DataTable } from '../ui/Table';

const ACTION_QUADRANTS: Quadrant[] = ['opbyg', 'succession', 'beskyt', 'omstil'];

function Scatter({ points, onOpen }: { points: (MatrixPoint & { n: number })[]; onOpen: (p: MatrixPoint) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const width = useWidth(wrap, 720);
  const height = Math.max(340, Math.min(520, Math.round(width * 0.62)));
  const [hover, setHover] = useState<string | null>(null);
  const m = { top: 16, right: 16, bottom: 46, left: 50 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;
  const x = (v: number) => m.left + ((v - 0.5) / 5) * iw;
  const y = (v: number) => m.top + ih - (v / 100) * ih;

  // Deterministisk spredning af punkter med samme x og nær samme y.
  const placed = useMemo(() => {
    const out: { p: MatrixPoint & { n: number }; cx: number; cy: number }[] = [];
    const sorted = [...points].filter((p) => p.x !== null && p.y !== null).sort((a, b) => a.n - b.n);
    for (const p of sorted) {
      let cx = x(p.x!);
      const cy = y(p.y!);
      let k = 0;
      while (out.some((o) => Math.hypot(o.cx - cx, o.cy - cy) < 22) && k < 12) {
        k += 1;
        cx = x(p.x!) + (k % 2 === 1 ? 1 : -1) * Math.ceil(k / 2) * 20;
      }
      out.push({ p, cx, cy });
    }
    return out;
  }, [points, width, height]); // eslint-disable-line react-hooks/exhaustive-deps

  const qx = x(MATRIX_THRESHOLDS.importance);
  const qy = y(MATRIX_THRESHOLDS.readiness);
  const hp = placed.find((o) => o.p.id === hover);

  return (
    <div ref={wrap} className="relative w-full">
      <svg width={width} height={height} role="img" aria-label="Future Value Matrix. Samme indhold findes i tabellen under diagrammet." className="block">
        <rect x={qx} y={m.top} width={m.left + iw - qx} height={qy - m.top} fill="#DCEAE5" opacity={0.55} />
        <rect x={qx} y={qy} width={m.left + iw - qx} height={m.top + ih - qy} fill="#F2D9D2" opacity={0.5} />
        <rect x={m.left} y={m.top} width={qx - m.left} height={qy - m.top} fill="#ECE6DA" opacity={0.7} />
        <rect x={m.left} y={qy} width={qx - m.left} height={m.top + ih - qy} fill="#F1ECE2" opacity={0.7} />
        <line x1={qx} x2={qx} y1={m.top} y2={m.top + ih} stroke="#BFB4A0" strokeDasharray="4 4" />
        <line x1={m.left} x2={m.left + iw} y1={qy} y2={qy} stroke="#BFB4A0" strokeDasharray="4 4" />
        <text x={m.left + iw - 8} y={m.top + 16} textAnchor="end" className="fill-teal text-[11px] font-semibold">Fasthold og udnyt</text>
        <text x={m.left + iw - 8} y={m.top + ih - 10} textAnchor="end" className="fill-risk text-[11px] font-semibold">Handl: opbyg · styrk succession · beskyt viden</text>
        <text x={m.left + 8} y={m.top + 16} className="fill-ink-2 text-[11px] font-semibold">Omstil eksisterende kapabilitet</text>
        <text x={m.left + 8} y={m.top + ih - 10} className="fill-ink-muted text-[11px] font-semibold">Overvåg</text>
        {[0, 25, 50, 75, 100].map((v) => (
          <text key={v} x={m.left - 8} y={y(v) + 4} textAnchor="end" className="num fill-ink-muted text-[11px]">
            {v}
          </text>
        ))}
        {[1, 2, 3, 4, 5].map((v) => (
          <text key={v} x={x(v)} y={m.top + ih + 18} textAnchor="middle" className="num fill-ink-muted text-[11px]">
            {v}
          </text>
        ))}
        <text x={m.left + iw / 2} y={height - 6} textAnchor="middle" className="fill-ink-2 text-[11.5px]">
          Betydning for fremtidens strategi (1–5) →
        </text>
        <text transform={`translate(13 ${m.top + ih / 2}) rotate(-90)`} textAnchor="middle" className="fill-ink-2 text-[11.5px]">
          Organisatorisk beredskab (0–100) →
        </text>
        {placed.map(({ p, cx, cy }) => {
          const r = 9 + Math.min(5, Math.sqrt(p.size));
          const active = hover === p.id;
          return (
            <g
              key={p.id}
              role="button"
              tabIndex={0}
              aria-label={`${p.n}. ${p.label}: betydning ${p.x}, beredskab ${fmtScore(p.y)}, ${p.quadrant ? QUADRANT_LABEL[p.quadrant] : ''}`}
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(p.id)}
              onBlur={() => setHover(null)}
              onClick={() => onOpen(p)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen(p))}
              className="cursor-pointer focus:outline-none"
            >
              <circle cx={cx} cy={cy} r={r + 6} fill="transparent" />
              <circle cx={cx} cy={cy} r={r} fill={active ? '#14213A' : '#1F3A60'} stroke="#FBF9F4" strokeWidth={2} />
              {active && <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="#14213A" strokeWidth={1.5} />}
              <text x={cx} y={cy + 4} textAnchor="middle" className="num pointer-events-none fill-paper text-[11px] font-semibold">
                {p.n}
              </text>
            </g>
          );
        })}
      </svg>
      {hp && (
        <div className="pointer-events-none absolute z-10 w-60 rounded-md border border-rule-strong bg-surface px-3 py-2 text-2xs shadow-raised" style={{ left: Math.min(Math.max(0, hp.cx + 14), width - 240), top: Math.max(0, hp.cy - 30) }} aria-hidden="true">
          <p className="font-semibold text-ink">{hp.p.label}</p>
          <p className="num text-ink-2">
            Betydning {hp.p.x} · beredskab {fmtScore(hp.p.y)}
          </p>
          <p className="text-ink-2">{hp.p.quadrant ? QUADRANT_LABEL[hp.p.quadrant] : ''}</p>
        </div>
      )}
    </div>
  );
}

export default function MatrixView() {
  const { analysis, unitId, asOf, openDetail } = useApp();
  const { unitShort } = useLookup();
  const { route, setParams } = useRouter();
  const view = (route.query.get('visning') === 'roller' ? 'roller' : 'kapabiliteter') as 'kapabiliteter' | 'roller';
  const raw = useMemo(() => (view === 'roller' ? rolePoints(analysis, unitId) : capabilityPoints(analysis, unitId)), [analysis, unitId, view]);
  const points = raw.map((p, i) => ({ ...p, n: i + 1 }));
  const open = (p: MatrixPoint) => openDetail(p.type === 'rolle' ? 'rolle' : 'kapabilitet', p.id);
  const compLabels = view === 'roller' ? ([['succession', 'Succession'], ['viden', 'Viden'], ['besættelse', 'Besat']] as const) : ([['kapacitet', 'Kapacitet'], ['viden', 'Viden'], ['succession', 'Succession']] as const);

  return (
    <div>
      <PageHeader
        eyebrow={`Modul B · ${fmtMonth(asOf)}`}
        title="Future Value Matrix™"
        lede="Hvor har organisationen beredskab til at dække det, strategien får mest brug for – og hvor skal der handles? Standardvisningen viser kapabiliteter; rollevisningen viser roller."
        actions={<Segmented label="Visning" value={view} onChange={(v) => setParams({ visning: v === 'roller' ? 'roller' : null })} options={[{ value: 'kapabiliteter', label: 'Kapabiliteter' }, { value: 'roller', label: 'Roller' }]} />}
      />
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Panel
            eyebrow={view === 'roller' ? 'Roller' : 'Kapabiliteter'}
            title="Betydning mod beredskab"
            footnote={
              view === 'roller'
                ? 'Roller: X er den højeste fremtidige betydning blandt rollens kapabiliteter. Y er gennemsnittet af effektiv succession (100 ved effektiv efterfølger inden for 2 år, 35 ved kandidater uden effektiv dækning inden for 2 år, 0 uden kandidater), robusthed i indehaverens kritiske viden og besættelse – højst svageste + 30. Punktstørrelse: kritikalitet.'
                : 'Kapabiliteter: X er direktionens vurdering. Y er gennemsnittet af kapacitetsdækning, robusthed i det svageste tilknyttede vidensområde og effektiv successionsdækning i kritiske roller – højst svageste komponent + 30. Punktstørrelse: krævet kapacitet.'
            }
          >
            {points.length === 0 ? <EmptyState title="Ingen punkter i udsnittet" /> : <Scatter points={points} onOpen={open} />}
          </Panel>
        </div>
        <div className="xl:col-span-4">
          <Panel eyebrow="Anbefalinger" title="Hvor skal der handles">
            <div className="space-y-4">
              {ACTION_QUADRANTS.map((q) => {
                const ps = points.filter((p) => p.quadrant === q);
                return (
                  <div key={q}>
                    <p className="text-sm font-semibold">
                      {QUADRANT_LABEL[q]} <span className="num font-normal text-ink-muted">({ps.length})</span>
                    </p>
                    <p className="text-2xs text-ink-muted">{QUADRANT_TEXT[q]}</p>
                    <ul className="mt-1 space-y-0.5 text-sm">
                      {ps.map((p) => (
                        <li key={p.id}>
                          <button type="button" className="link text-left" onClick={() => open(p)}>
                            <span className="num mr-1 font-mono text-2xs text-ink-muted">{p.n}</span>
                            {p.label}
                          </button>
                        </li>
                      ))}
                      {ps.length === 0 && <li className="text-2xs text-ink-muted">Ingen</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 border-t border-rule pt-3 text-2xs text-ink-muted">
              Høj betydning: fra {fmtNumber(MATRIX_THRESHOLDS.importance, 1)}. Tilstrækkeligt beredskab: fra {MATRIX_THRESHOLDS.readiness}. Er kapacitetsdækningen under {MATRIX_THRESHOLDS.capacityFirst} %, anbefales kapacitetsopbygning først, fordi viden og succession forudsætter mennesker at overføre til.
            </p>
          </Panel>
        </div>
      </div>
      <section className="panel mt-6" aria-labelledby="matrix-tabel">
        <div className="border-b border-rule px-5 py-4">
          <h2 id="matrix-tabel" className="font-serif text-lg font-semibold">
            Tabelvisning
          </h2>
        </div>
        <div className="px-2 pb-2">
          <DataTable
            caption="Future Value Matrix som tabel"
            rows={points}
            rowKey={(p) => p.id}
            onRowClick={open}
            rowLabel={(p) => p.label}
            initialSort={{ key: 'y', dir: 'asc' }}
            columns={[
              { key: 'n', header: 'Nr.', align: 'right', render: (p) => <span className="num font-mono text-2xs">{p.n}</span>, sortValue: (p) => p.n },
              { key: 'navn', header: view === 'roller' ? 'Rolle' : 'Kapabilitet', render: (p) => <span className="font-medium">{p.label}</span>, sortValue: (p) => p.label },
              { key: 'enhed', header: 'Enhed', render: (p) => <span className="text-2xs text-ink-2">{unitShort(p.unitId)}</span>, sortValue: (p) => p.unitId },
              { key: 'x', header: 'Betydning', align: 'right', render: (p) => <span className="num">{p.x ?? '—'}</span>, sortValue: (p) => p.x },
              { key: 'y', header: 'Beredskab', align: 'right', render: (p) => <span className="num font-semibold">{fmtScore(p.y)}</span>, sortValue: (p) => p.y },
              ...compLabels.map(([k, label]) => ({
                key: k,
                header: label,
                align: 'right' as const,
                render: (p: MatrixPoint) => <span className={`num text-2xs ${p.weakest === k && (p.components[k] ?? 100) < MATRIX_THRESHOLDS.readiness ? 'font-semibold text-risk' : 'text-ink-2'}`}>{p.components[k] === null || p.components[k] === undefined ? '—' : fmtScore(p.components[k]!)}</span>,
                sortValue: (p: MatrixPoint) => p.components[k] ?? null,
              })),
              { key: 'q', header: 'Anbefaling', render: (p) => <span className="text-2xs">{p.quadrant ? QUADRANT_LABEL[p.quadrant] : 'Utilstrækkeligt datagrundlag'}</span>, sortValue: (p) => p.quadrant ?? '' },
            ]}
          />
        </div>
        <p className="border-t border-rule px-5 py-3 text-2xs text-ink-muted">Svageste komponent er fremhævet, når den er under 60. Platformen viser ikke personer i matrixen og beregner ingen samlet værdi af mennesker.</p>
      </section>
    </div>
  );
}
