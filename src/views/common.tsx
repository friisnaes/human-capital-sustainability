/** Små, delte visningskomponenter på tværs af moduler. */
import type { ReactNode } from 'react';
import type { Id } from '../domain/types';
import { type DetailType, useApp, useLookup } from '../state/AppState';

/** Knap, der åbner en detaljevisning (rolle, risiko, kapabilitet …). */
export function DetailLink({ type, id, children, className = '' }: { type: DetailType; id: Id; children: ReactNode; className?: string }) {
  const { openDetail } = useApp();
  return (
    <button
      type="button"
      className={`link text-left ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        openDetail(type, id);
      }}
    >
      {children}
    </button>
  );
}

export function GoalChips({ goalIds }: { goalIds: Id[] }) {
  const { goals } = useLookup();
  if (!goalIds.length) return <span className="text-2xs text-ink-muted">Ingen mål</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {goalIds.map((g) => (
        <span key={g} className="chip" title={goals.get(g)?.title}>
          <span className="font-mono">{goals.get(g)?.code ?? g}</span>
          <span className="sr-only">: {goals.get(g)?.title}</span>
        </span>
      ))}
    </span>
  );
}

export function UnitTag({ unitId }: { unitId: Id }) {
  const { unitShort } = useLookup();
  return <span className="text-2xs text-ink-muted">{unitShort(unitId)}</span>;
}

export function Readiness({ value }: { value: 'nu' | '1-2' | '3-5' | null }) {
  if (!value) return <span className="text-ink-muted">Ikke vurderet</span>;
  const map = {
    nu: { label: 'Klar nu', cls: 'border-teal-mark bg-teal-soft text-teal' },
    '1-2': { label: '1–2 år', cls: 'border-navy-mark/40 bg-navy-soft text-navy' },
    '3-5': { label: '3–5 år', cls: 'border-rule-strong bg-paper text-ink-2' },
  } as const;
  const m = map[value];
  return <span className={`inline-flex items-center rounded-sm border px-1.5 py-px text-2xs font-medium ${m.cls}`}>{m.label}</span>;
}

/** Markering af, om en vurdering hviler på dokumenteret evidens eller menneskelig vurdering. */
export function BasisMark({ basis }: { basis: 'dokumenteret' | 'vurdering' | 'registerdata' | null }) {
  if (!basis) return null;
  const label = basis === 'dokumenteret' ? 'Dokumenteret evidens' : basis === 'vurdering' ? 'Menneskelig vurdering' : 'Registerdata';
  return (
    <span className="inline-flex items-center gap-1 text-2xs text-ink-muted" title={label}>
      <span aria-hidden="true" className={`inline-block h-2 w-2 ${basis === 'dokumenteret' ? 'rounded-sm bg-ink-2' : basis === 'vurdering' ? 'rounded-full border border-ink-2' : 'rotate-45 bg-ink-faint'}`} />
      {label}
    </span>
  );
}

export function DemoNotice({ children }: { children?: ReactNode }) {
  return (
    <p className="rounded-sm border border-amber-mark/40 bg-amber-soft/60 px-3 py-2 text-2xs text-amber">
      <strong className="font-semibold">Fiktive demodata.</strong> {children ?? 'Virksomhed, personer og tal er opdigtede og må ikke forveksles med virkelige forhold.'}
    </p>
  );
}
