/**
 * Statusmarkeringer. Farve er aldrig eneste bærer af betydning: hver status
 * har sin egen form og altid en tekstlig label.
 */
import type { RiskStatus } from '../domain/types';
import { STATUS_LABEL } from '../model/catalog';
import type { Status } from '../model/ors';
import { BAND_LABEL, type Band } from '../model/risk';

export const STATUS_COLOR: Record<Status, string> = {
  robust: '#3E8C80',
  tilstrækkelig: '#2F5585',
  sårbar: '#C68A1E',
  kritisk: '#B6402D',
  utilstrækkelig: '#8D95A3',
};

const STATUS_TEXT_CLASS: Record<Status, string> = {
  robust: 'text-teal',
  tilstrækkelig: 'text-navy',
  sårbar: 'text-amber',
  kritisk: 'text-risk',
  utilstrækkelig: 'text-ink-muted',
};

export function StatusShape({ status, size = 10 }: { status: Status; size?: number }) {
  const c = STATUS_COLOR[status];
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 10 10" aria-hidden="true" className="shrink-0">
      {status === 'robust' && <circle cx="5" cy="5" r="4.5" fill={c} />}
      {status === 'tilstrækkelig' && <circle cx="5" cy="5" r="3.6" fill="none" stroke={c} strokeWidth="1.8" />}
      {status === 'sårbar' && <path d="M5 0.6L9.6 9.2H0.4z" fill={c} />}
      {status === 'kritisk' && <path d="M5 0.2L9.8 5 5 9.8 0.2 5z" fill={c} />}
      {status === 'utilstrækkelig' && <circle cx="5" cy="5" r="3.8" fill="none" stroke={c} strokeWidth="1.4" strokeDasharray="1.6 1.4" />}
    </svg>
  );
}

export function StatusBadge({ status, size = 'sm' }: { status: Status; size?: 'sm' | 'md' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${STATUS_TEXT_CLASS[status]} ${size === 'md' ? 'text-sm' : 'text-2xs'}`}>
      <StatusShape status={status} size={size === 'md' ? 11 : 9} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export const BAND_STATUS: Record<Band, Status> = {
  kritisk: 'kritisk',
  høj: 'sårbar',
  moderat: 'tilstrækkelig',
  lav: 'robust',
};

export function BandBadge({ band, priority }: { band: Band; priority?: number }) {
  const st = BAND_STATUS[band];
  return (
    <span className={`inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.06em] ${STATUS_TEXT_CLASS[st]}`}>
      <StatusShape status={st} size={9} />
      {BAND_LABEL[band]}
      {priority !== undefined && <span className="num font-mono font-medium normal-case tracking-normal text-ink-2">{priority}</span>}
    </span>
  );
}

const RISK_STATUS_LABEL: Record<RiskStatus, string> = {
  åben: 'Åben',
  'under behandling': 'Under behandling',
  'delvist afværget': 'Delvist afværget',
  accepteret: 'Accepteret',
};

export function RiskStatusText({ status }: { status: RiskStatus | null }) {
  if (!status) return <span className="text-ink-muted">Ikke behandlet</span>;
  return <span>{RISK_STATUS_LABEL[status]}</span>;
}

export { RISK_STATUS_LABEL };
