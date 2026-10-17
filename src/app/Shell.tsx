/** Applikationens ramme: navigation, globale filtre og demomarkering. */
import { type ReactNode, useEffect, useState } from 'react';
import { Link, useRouter } from '../lib/router';
import { fmtMonth } from '../lib/format';
import { periodKey, useApp } from '../state/AppState';
import { COMPARISON_MONTHS } from '../state/AppState';
import { IconClose, IconMenu } from '../ui/icons';

export interface NavItem {
  path: string;
  label: string;
  sub: string;
}

export const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Overblik', items: [{ path: '/', label: 'Direktionsoverblik', sub: 'Robusthed, risici og beslutninger' }] },
  {
    group: 'Moduler',
    items: [
      { path: '/ors', label: 'Organizational Resilience Score™', sub: 'Samlet robusthed og beregning' },
      { path: '/matrix', label: 'Future Value Matrix™', sub: 'Fremtidig betydning mod beredskab' },
      { path: '/afhaengigheder', label: 'Strategic Dependency Mapper™', sub: 'Strategiske afhængigheder' },
      { path: '/pipeline', label: 'Leadership Pipeline Engine™', sub: 'Succession og lederudvikling' },
      { path: '/kultur', label: 'Culture Infrastructure Map™', sub: 'Kultur som praksis' },
      { path: '/risici', label: 'Human Capital Risk Dashboard™', sub: 'Prioriteret risikoregister' },
    ],
  },
  {
    group: 'Beslutning',
    items: [
      { path: '/scenarier', label: 'Scenariesimulering', sub: 'Hvad sker der, hvis …' },
      { path: '/handlinger', label: 'Handlingsplan', sub: 'Ansvar, frister og effekt' },
    ],
  },
  {
    group: 'Dokumentation',
    items: [
      { path: '/model', label: 'Modelkatalog', sub: 'Formler, vægte og tærskler' },
      { path: '/rapport', label: 'Bestyrelsesrapport', sub: 'Udskriv eller gem som PDF' },
      { path: '/om', label: 'Om demonstrationen', sub: 'Data, begrænsninger, nulstilling' },
    ],
  },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { route } = useRouter();
  return (
    <nav aria-label="Hovednavigation" className="flex flex-col gap-6">
      {NAV.map((g) => (
        <div key={g.group}>
          <p className="eyebrow mb-2 px-3 !text-[0.68rem] !text-ink-faint">{g.group}</p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((it) => {
              const active = route.path === it.path;
              return (
                <li key={it.path} onClick={onNavigate}>
                  <Link
                    to={it.path}
                    ariaCurrent={active}
                    className={`group block rounded-sm border-l-2 px-3 py-1.5 transition-colors ${active ? 'border-paper bg-white/10' : 'border-transparent hover:bg-white/5'}`}
                  >
                    <span className={`block text-[13px] font-medium leading-snug ${active ? 'text-paper' : 'text-paper/85 group-hover:text-paper'}`}>{it.label}</span>
                    <span className="block text-[11.5px] leading-snug text-paper/70">{it.sub}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  const { data } = useApp();
  return (
    <div>
      <Link to="/" className="block">
        <span className="block font-serif text-[1.05rem] font-semibold leading-tight text-paper">Human Capital Sustainability™</span>
      </Link>
      <span className="mt-1 block text-[11.5px] leading-snug text-paper/70">Executive intelligence for organisatorisk robusthed</span>
      <span className="mt-4 block border-t border-white/10 pt-3 text-[12px] text-paper/85">{data.organization.name}</span>
      <span className="mt-1 inline-flex items-center gap-1.5 rounded-sm bg-amber-soft px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-amber">
        Fiktive demodata
      </span>
    </div>
  );
}

function Filters() {
  const { data, periods, unitId, asOf, setUnit, setPeriod, comparison } = useApp();
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
      <label className="flex flex-col gap-0.5">
        <span className="text-2xs font-medium text-ink-muted">Enhed</span>
        <select className="field min-w-[12rem]" value={unitId ?? ''} onChange={(e) => setUnit(e.target.value || null)}>
          <option value="">Hele organisationen</option>
          {data.units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-2xs font-medium text-ink-muted">Periode</span>
        <select className="field min-w-[10rem]" value={periodKey(asOf)} onChange={(e) => setPeriod(e.target.value)}>
          {[...periods].reverse().map((p) => (
            <option key={p} value={periodKey(p)}>
              {fmtMonth(p)}
            </option>
          ))}
        </select>
      </label>
      <p className="pb-1.5 text-2xs text-ink-muted">
        {comparison ? `Ændringer sammenlignes med ${fmtMonth(comparison.date)} (${COMPARISON_MONTHS} mdr. før)` : 'Ingen sammenligningsperiode i historikken'}
      </p>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { route } = useRouter();
  useEffect(() => setMenuOpen(false), [route.path]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17.5rem_1fr]">
      <a
        href="#indhold"
        onClick={(e) => {
          // Hash-routeren må ikke tolke ankeret som en side: flyt blot fokus til indholdet.
          e.preventDefault();
          document.getElementById('indhold')?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:shadow-raised">
        Spring til indhold
      </a>

      {/* Sidebjælke på desktop */}
      <aside className="no-print sticky top-0 hidden h-screen flex-col gap-8 overflow-y-auto bg-ink px-4 py-6 lg:flex">
        <div className="px-3">
          <Brand />
        </div>
        <NavList />
        <p className="mt-auto px-3 text-[11px] leading-relaxed text-paper/60">
          Demonstration med fiktive data. Ingen login, ingen persondata og ingen serverlagring.
        </p>
      </aside>

      {/* Topbjælke på tablet og mobil */}
      <div className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 bg-ink px-4 py-3 lg:hidden">
        <Link to="/" className="font-serif text-[15px] font-semibold text-paper">
          Human Capital Sustainability™
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-sm bg-amber-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber">Demo</span>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-white/20 text-paper"
            aria-expanded={menuOpen}
            aria-controls="mobilmenu"
            aria-label={menuOpen ? 'Luk menu' : 'Åbn menu'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div id="mobilmenu" className="no-print fixed inset-x-0 bottom-0 top-[57px] z-30 overflow-y-auto bg-ink px-4 pb-10 pt-4 lg:hidden">
          <div className="mb-6 px-3">
            <Brand />
          </div>
          <NavList onNavigate={() => setMenuOpen(false)} />
        </div>
      )}

      <div className="min-w-0">
        <div className="no-print border-b border-rule bg-paper/95 px-4 py-3 backdrop-blur sm:px-8 lg:sticky lg:top-0 lg:z-20">
          <Filters />
        </div>
        <main id="indhold" tabIndex={-1} className="mx-auto max-w-page px-4 pb-16 pt-8 focus:outline-none sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
