/** Tal og små visuelle elementer: ændringer, dækning og scorebjælker. */
import type { ReactNode } from 'react';
import { CURRENT_MODEL } from '../model/config';
import { statusFor } from '../model/ors';
import { fmtDelta, fmtPct, fmtScore } from '../lib/format';
import { STATUS_COLOR } from './Status';

/** Ændring med modellens opløsning: små ændringer vises som uændret. */
export function Delta({ value, suffix, invert = false }: { value: number | null; suffix?: ReactNode; invert?: boolean }) {
  if (value === null) return <span className="text-ink-muted">Ingen sammenligning</span>;
  const r = Math.round(value);
  const flat = Math.abs(r) < CURRENT_MODEL.changeResolution;
  const good = invert ? r < 0 : r > 0;
  const cls = flat ? 'text-ink-2' : good ? 'text-teal' : 'text-risk';
  const arrow = flat ? '→' : r > 0 ? '↑' : '↓';
  return (
    <span className={`num inline-flex items-baseline gap-1 ${cls}`}>
      <span aria-hidden="true">{arrow}</span>
      <span className="font-medium">{fmtDelta(value)}</span>
      {flat && <span className="text-2xs text-ink-muted">(uændret)</span>}
      {suffix && <span className="text-ink-muted">{suffix}</span>}
    </span>
  );
}

export function CoverageText({ coverage, label = 'Datadækning' }: { coverage: number; label?: string }) {
  const low = coverage < 0.75;
  return (
    <span className={`num ${low ? 'text-amber' : 'text-ink-2'}`}>
      {label} {fmtPct(coverage)}
      {low && <span className="ml-1 text-2xs">(lav)</span>}
    </span>
  );
}

/**
 * Horisontal scorebjælke 0–100 med statusgrænser som diskrete streger.
 * Bjælken er dekorativ; værdien står altid som tekst ved siden af.
 */
export function ScoreBar({ score, marker, height = 8, label }: { score: number | null; marker?: number | null; height?: number; label: string }) {
  const t = CURRENT_MODEL.thresholds;
  const st = statusFor(score);
  return (
    <div className="relative w-full" role="img" aria-label={`${label}: ${score === null ? 'utilstrækkeligt datagrundlag' : `${fmtScore(score)} af 100`}`}>
      <div className="relative w-full overflow-hidden rounded-sm bg-sunk" style={{ height }}>
        {score !== null && (
          <div className="absolute inset-y-0 left-0 rounded-r-sm" style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: STATUS_COLOR[st] }} />
        )}
        {score === null && <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_4px,rgba(20,33,58,0.08)_4px_6px)]" />}
      </div>
      {[t.sårbar, t.tilstrækkelig, t.robust].map((v) => (
        <span key={v} className="absolute top-0 w-px bg-paper" style={{ left: `${v}%`, height }} aria-hidden="true" />
      ))}
      {marker !== undefined && marker !== null && (
        <span className="absolute -top-1 w-0.5 bg-ink" style={{ left: `calc(${Math.max(0, Math.min(100, marker))}% - 1px)`, height: height + 8 }} aria-hidden="true" />
      )}
    </div>
  );
}

/** Lille, neutral andelsbjælke (fx dækning). */
export function ShareBar({ share, label }: { share: number; label: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-sm bg-sunk" role="img" aria-label={`${label}: ${fmtPct(share)}`}>
      <div className="h-full bg-navy-mark" style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%` }} />
    </div>
  );
}

export function Score({ value, className = '' }: { value: number | null; className?: string }) {
  return <span className={`num ${className}`}>{fmtScore(value)}</span>;
}
