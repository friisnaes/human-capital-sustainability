/**
 * Udvikling over tid. Viser den genberegnede score (gældende model) som linje
 * og den oprindeligt rapporterede score som punkter, hvor de afviger.
 * Modelskift og ændringer i datagrundlaget markeres med nummererede streger.
 */
import { type KeyboardEvent, useId, useMemo, useRef, useState } from 'react';
import { CURRENT_MODEL, type DimensionId } from '../../model/config';
import type { History } from '../../model/history';
import type { OrsResult } from '../../model/ors';
import { fmtMonth, fmtMonthShort, fmtPct, fmtScore } from '../../lib/format';
import { useWidth } from './useWidth';

type Metric = 'ors' | DimensionId;

function valueOf(o: OrsResult, metric: Metric): number | null {
  if (metric === 'ors') return o.score;
  return o.dimensions.find((d) => d.id === metric)?.score ?? null;
}

export function HistoryChart({
  history,
  metric = 'ors',
  label,
  selectedDate,
  height = 240,
}: {
  history: History;
  metric?: Metric;
  label: string;
  selectedDate?: string;
  height?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const width = useWidth(wrap);
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const descId = useId();

  const pts = history.snapshots.map((s) => ({
    date: s.date,
    current: valueOf(s.current, metric),
    reported: valueOf(s.reported, metric),
    version: s.modelVersionAtTime,
    coverage: metric === 'ors' ? s.current.coverage : s.current.dimensions.find((d) => d.id === metric)?.coverage ?? 0,
  }));
  const events = history.events.filter((e) => metric === 'ors' || e.kind === 'datagrundlag');

  const m = { top: 22, right: 92, bottom: 30, left: 34 };
  const iw = Math.max(80, width - m.left - m.right);
  const ih = height - m.top - m.bottom;
  const x = (i: number) => m.left + (pts.length <= 1 ? iw / 2 : (i * iw) / (pts.length - 1));
  const y = (v: number) => m.top + ih - (v / 100) * ih;
  const t = CURRENT_MODEL.thresholds;

  const segments = useMemo(() => {
    const segs: { i: number; v: number }[][] = [];
    let cur: { i: number; v: number }[] = [];
    pts.forEach((p, i) => {
      if (p.current === null) {
        if (cur.length) segs.push(cur);
        cur = [];
      } else cur.push({ i, v: p.current });
    });
    if (cur.length) segs.push(cur);
    return segs;
  }, [pts]);

  const eventIndex = (date: string) => {
    const i = pts.findIndex((p) => p.date >= date);
    return i < 0 ? pts.length - 1 : i;
  };

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round(((px - m.left) / iw) * (pts.length - 1));
    setHover(Math.max(0, Math.min(pts.length - 1, i)));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(pts.length - 1, (h ?? pts.length - 1) + 1));
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? pts.length - 1) - 1));
    else if (e.key === 'Escape') setHover(null);
    else return;
    e.preventDefault();
  };

  const h = hover !== null ? pts[hover] : undefined;
  const selIdx = selectedDate ? pts.findIndex((p) => p.date === selectedDate) : -1;
  const lastValid = [...pts].reverse().find((p) => p.current !== null);
  const summary = `${label}: ${pts
    .filter((p) => p.current !== null)
    .map((p) => `${fmtMonth(p.date)} ${fmtScore(p.current)}`)
    .join(', ')}.`;

  const zones = [
    { from: t.robust, to: 100, label: 'Robust' },
    { from: t.tilstrækkelig, to: t.robust, label: 'Tilstrækkelig' },
    { from: t.sårbar, to: t.tilstrækkelig, label: 'Sårbar' },
    { from: 0, to: t.sårbar, label: 'Kritisk' },
  ];

  return (
    <div>
      <div ref={wrap} className="relative w-full">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${label}. Brug piletasterne for at se de enkelte måneder.`}
          aria-describedby={descId}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
          className="block touch-pan-y focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy"
        >
          {zones.map((z, i) => (
            <g key={z.label}>
              <rect x={m.left} y={y(z.to)} width={iw} height={y(z.from) - y(z.to)} fill={i % 2 === 0 ? '#ECE6DA' : '#F1ECE2'} opacity={0.55} />
              <text x={m.left + iw + 8} y={(y(z.from) + y(z.to)) / 2 + 4} className="fill-ink-muted text-[11px]">
                {z.label}
              </text>
            </g>
          ))}
          {[0, t.sårbar, t.tilstrækkelig, t.robust, 100].map((v) => (
            <g key={v}>
              <line x1={m.left} x2={m.left + iw} y1={y(v)} y2={y(v)} stroke="#DAD2C2" strokeWidth={1} />
              <text x={m.left - 6} y={y(v) + 4} textAnchor="end" className="num fill-ink-muted text-[11px]">
                {v}
              </text>
            </g>
          ))}
          {pts.map((p, i) =>
            i % (width < 520 ? 3 : 2) === 0 || i === pts.length - 1 ? (
              <text key={p.date} x={x(i)} y={height - 10} textAnchor="middle" className="fill-ink-muted text-[11px]">
                {fmtMonthShort(p.date)}
              </text>
            ) : null,
          )}
          {events.map((e, n) => {
            const i = eventIndex(e.date);
            return (
              <g key={`${e.date}-${n}`} aria-hidden="true">
                <line x1={x(i)} x2={x(i)} y1={m.top - 4} y2={m.top + ih} stroke="#5B6577" strokeDasharray="3 3" strokeWidth={1} />
                <circle cx={x(i)} cy={m.top - 10} r={8} fill="#FBF9F4" stroke="#5B6577" />
                <text x={x(i)} y={m.top - 6.5} textAnchor="middle" className="fill-ink text-[10px] font-semibold">
                  {n + 1}
                </text>
              </g>
            );
          })}
          {selIdx >= 0 && <line x1={x(selIdx)} x2={x(selIdx)} y1={m.top} y2={m.top + ih} stroke="#14213A" strokeOpacity={0.25} strokeWidth={6} />}
          {segments.map((seg, k) => (
            <polyline key={k} points={seg.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')} fill="none" stroke="#1F3A60" strokeWidth={2} strokeLinejoin="round" />
          ))}
          {pts.map((p, i) =>
            p.reported !== null && p.current !== null && Math.abs(p.reported - p.current) >= 0.5 ? (
              <circle key={`r${i}`} cx={x(i)} cy={y(p.reported)} r={4} fill="#FBF9F4" stroke="#C68A1E" strokeWidth={2} />
            ) : null,
          )}
          {lastValid && lastValid.current !== null && (
            <g>
              <circle cx={x(pts.indexOf(lastValid))} cy={y(lastValid.current)} r={4.5} fill="#1F3A60" stroke="#FBF9F4" strokeWidth={2} />
            </g>
          )}
          {h && hover !== null && (
            <g aria-hidden="true">
              <line x1={x(hover)} x2={x(hover)} y1={m.top} y2={m.top + ih} stroke="#14213A" strokeWidth={1} />
              {h.current !== null && <circle cx={x(hover)} cy={y(h.current)} r={5} fill="#1F3A60" stroke="#FBF9F4" strokeWidth={2} />}
            </g>
          )}
        </svg>
        {h && hover !== null && (
          <div
            className="pointer-events-none absolute z-10 w-56 rounded-md border border-rule-strong bg-surface px-3 py-2 text-2xs shadow-raised"
            style={{ left: Math.min(Math.max(0, x(hover) - 112), width - 224), top: 0 }}
            aria-hidden="true"
          >
            <p className="font-semibold text-ink">{fmtMonth(h.date)}</p>
            <p className="num mt-1 text-ink-2">
              Genberegnet (v{CURRENT_MODEL.version}): <strong className="text-ink">{h.current === null ? 'utilstrækkeligt data' : fmtScore(h.current)}</strong>
            </p>
            <p className="num text-ink-2">
              Rapporteret (v{h.version}): {h.reported === null ? 'utilstrækkeligt data' : fmtScore(h.reported)}
            </p>
            <p className="num text-ink-muted">Datadækning {fmtPct(h.coverage)}</p>
          </div>
        )}
        <p id={descId} className="sr-only" aria-live="polite">
          {h ? `${fmtMonth(h.date)}: ${h.current === null ? 'utilstrækkeligt datagrundlag' : fmtScore(h.current)}` : summary}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3 text-2xs text-ink-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden="true"><line x1="0" x2="18" y1="3" y2="3" stroke="#1F3A60" strokeWidth="2" /></svg>
            Genberegnet med gældende model (v{CURRENT_MODEL.version})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="3.5" fill="#FBF9F4" stroke="#C68A1E" strokeWidth="2" /></svg>
            Rapporteret med tidligere model (kun hvor den afviger)
          </span>
        </div>
        <button type="button" className="link no-print" onClick={() => setShowTable((s) => !s)} aria-expanded={showTable}>
          {showTable ? 'Skjul tal' : 'Vis tal'}
        </button>
      </div>
      {events.length > 0 && (
        <ol className="mt-3 space-y-1 text-2xs leading-relaxed text-ink-2">
          {events.map((e, n) => (
            <li key={`${e.date}-${n}`} className="flex gap-2">
              <span className="num inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-ink-muted text-[10px] font-semibold">{n + 1}</span>
              <span>
                <strong className="font-medium text-ink">{e.kind === 'model' ? 'Modelændring.' : 'Ændret datagrundlag.'}</strong> {e.text}
              </span>
            </li>
          ))}
        </ol>
      )}
      {showTable && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-2xs">
            <caption className="sr-only">{label} pr. måned</caption>
            <thead>
              <tr>
                <th className="th">Måned</th>
                <th className="th text-right">Genberegnet</th>
                <th className="th text-right">Rapporteret</th>
                <th className="th">Model</th>
                <th className="th text-right">Datadækning</th>
              </tr>
            </thead>
            <tbody>
              {pts.map((p) => (
                <tr key={p.date}>
                  <td className="td !py-1.5">{fmtMonth(p.date)}</td>
                  <td className="td num !py-1.5 text-right">{p.current === null ? '—' : fmtScore(p.current)}</td>
                  <td className="td num !py-1.5 text-right">{p.reported === null ? '—' : fmtScore(p.reported)}</td>
                  <td className="td !py-1.5">v{p.version}</td>
                  <td className="td num !py-1.5 text-right">{fmtPct(p.coverage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
