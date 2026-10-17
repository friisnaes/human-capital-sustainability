/** Fælles layoutkomponenter: sidehoved, paneler og definitionslister. */
import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
  productName,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  productName?: string;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-rule pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        {productName && <p className="mt-2 font-serif text-sm italic text-ink-2">{productName}</p>}
        <h1 className="mt-1.5 hyphens-auto break-words font-serif text-[1.75rem] font-semibold leading-tight tracking-[-0.01em] sm:text-[2.1rem]">{title}</h1>
        {lede && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">{lede}</p>}
      </div>
      {actions && <div className="no-print flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  eyebrow,
  actions,
  footnote,
  children,
  id,
  className = '',
  bodyClassName = 'p-5',
}: {
  title?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  footnote?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
  bodyClassName?: string;
}) {
  const headingId = id ? `${id}-titel` : undefined;
  return (
    <section className={`panel avoid-break ${className}`} aria-labelledby={title ? headingId : undefined} id={id}>
      {(title || actions || eyebrow) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rule px-5 pb-3 pt-4">
          <div>
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            {title && (
              <h2 id={headingId} className="font-serif text-lg font-semibold leading-snug">
                {title}
              </h2>
            )}
          </div>
          {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
      {footnote && <div className="border-t border-rule px-5 py-3 text-2xs leading-relaxed text-ink-muted">{footnote}</div>}
    </section>
  );
}

export function DefList({ items, className = '' }: { items: [ReactNode, ReactNode][]; className?: string }) {
  return (
    <dl className={`grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[minmax(8rem,auto)_minmax(0,1fr)] sm:gap-y-2 ${className}`}>
      {items.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="text-ink-muted">{k}</dt>
          <dd className="mb-2 min-w-0 break-words text-ink sm:mb-0">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h3 id={id} className="mb-3 font-sans text-2xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
      {children}
    </h3>
  );
}
