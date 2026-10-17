/** Dialog (sideskuffe), segmenteret valg, forklaringer og tilstande. */
import { Component, type ErrorInfo, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { IconClose, IconInfo } from './icons';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Sideskuffe med fokusfælde, Esc-lukning og fokus tilbage til udløseren. */
export function Drawer({ open, title, eyebrow, onClose, children }: { open: boolean; title: ReactNode; eyebrow?: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab' && ref.current) {
        const els = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!els.length) return;
        const first = els[0]!;
        const last = els[els.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      lastFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-full w-full max-w-[44rem] flex-col border-l border-rule-strong bg-surface shadow-raised"
      >
        <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4 sm:px-7">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id={titleId} className="mt-1 font-serif text-xl font-semibold leading-snug">
              {title}
            </h2>
          </div>
          <button type="button" className="btn shrink-0 !px-2" onClick={onClose} data-autofocus aria-label="Luk detaljer">
            <IconClose />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">{children}</div>
      </div>
    </div>
  );
}

/** Segmenteret valg (radiogruppe) – til visningsskift. */
export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded border border-rule-strong bg-surface p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              const idx = options.findIndex((x) => x.value === value);
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                onChange(options[(idx + 1) % options.length]!.value);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                onChange(options[(idx - 1 + options.length) % options.length]!.value);
              }
            }}
            tabIndex={active ? 0 : -1}
            className={`rounded-sm px-3 py-1 text-sm transition-colors ${active ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-sunk'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Forklaring bag en lille info-knap. */
export function InfoTip({ label, children, align = 'left' }: { label: string; children: ReactNode; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-muted hover:bg-sunk hover:text-ink"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Forklaring: ${label}`}
        onClick={() => setOpen((o) => !o)}
      >
        <IconInfo size={14} />
      </button>
      {open && (
        <span
          id={id}
          role="note"
          className={`absolute top-6 z-40 w-72 max-w-[80vw] rounded-md border border-rule-strong bg-surface p-3 text-left text-2xs font-normal normal-case leading-relaxed tracking-normal text-ink-2 shadow-raised ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {children}
        </span>
      )}
    </span>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-rule-strong bg-paper/60 px-5 py-6">
      <p className="font-medium text-ink">{title}</p>
      {children && <p className="max-w-xl text-sm text-ink-2">{children}</p>}
      {action}
    </div>
  );
}

export function InsufficientData({ reason }: { reason?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-2xs text-ink-muted">
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <circle cx="5" cy="5" r="3.8" fill="none" stroke="#8D95A3" strokeWidth="1.4" strokeDasharray="1.6 1.4" />
      </svg>
      Utilstrækkeligt datagrundlag{reason ? `: ${reason}` : ''}
    </span>
  );
}

export function LoadingState({ label = 'Indlæser …' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-ink-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-navy-mark" aria-hidden="true" />
        {label}
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode; label: string }, { error: Error | null }> {
  override state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Fejl i modul', error, info);
  }
  override render() {
    if (this.state.error) {
      return (
        <div role="alert" className="panel p-6">
          <p className="eyebrow">Fejl</p>
          <p className="mt-2 font-serif text-lg font-semibold">{this.props.label} kunne ikke vises</p>
          <p className="mt-2 text-sm text-ink-2">Der opstod en uventet fejl. Øvrige moduler virker fortsat. Prøv at genindlæse siden.</p>
          <p className="mt-2 font-mono text-2xs text-ink-muted">{this.state.error.message}</p>
          <button type="button" className="btn mt-4" onClick={() => window.location.reload()}>
            Genindlæs siden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
