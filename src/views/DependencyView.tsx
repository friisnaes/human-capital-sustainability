/** Modul C – Strategic Dependency Mapper™: mål → kapabiliteter → roller → personer → kritisk viden. */
import { useMemo, useRef, useState } from 'react';
import { CRITICALITY } from '../model/config';
import { buildGraph, FINDING_LABEL, type FindingKind, type GraphNode, type NodeType } from '../model/dependencies';
import { fmtMonth } from '../lib/format';
import { useRouter } from '../lib/router';
import { useApp } from '../state/AppState';
import { useWidth } from '../ui/charts/useWidth';
import { PageHeader, Panel } from '../ui/Layout';
import { EmptyState, Segmented } from '../ui/Overlay';
import { StatusShape } from '../ui/Status';
import { DataTable } from '../ui/Table';

const COLUMNS: { type: NodeType; label: string }[] = [
  { type: 'mål', label: 'Strategiske mål' },
  { type: 'kapabilitet', label: 'Kapabiliteter' },
  { type: 'rolle', label: 'Roller' },
  { type: 'person', label: 'Nøglepersoner' },
  { type: 'viden', label: 'Kritisk viden' },
];

const SEVERE: FindingKind[] = ['enkeltperson', 'videnskoncentration'];
const KINDS = Object.keys(FINDING_LABEL) as FindingKind[];

function connected(start: Set<string>, edges: { from: string; to: string }[], dir: 'down' | 'up' | 'both'): Set<string> {
  const out = new Set(start);
  const stack = [...start];
  while (stack.length) {
    const n = stack.pop()!;
    for (const e of edges) {
      if ((dir === 'down' || dir === 'both') && e.from === n && !out.has(e.to)) {
        out.add(e.to);
        stack.push(e.to);
      }
      if ((dir === 'up' || dir === 'both') && e.to === n && !out.has(e.from)) {
        out.add(e.from);
        stack.push(e.from);
      }
    }
  }
  return out;
}

/** Sti gennem en node: alt opstrøms og nedstrøms (ikke sidegrene). */
function pathThrough(id: string, edges: { from: string; to: string }[]): Set<string> {
  const up = connected(new Set([id]), edges, 'up');
  const down = connected(new Set([id]), edges, 'down');
  return new Set([...up, ...down]);
}

function Graph({ nodes, edges, onOpen }: { nodes: GraphNode[]; edges: { from: string; to: string; weak: boolean }[]; onOpen: (n: GraphNode) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const measured = useWidth(wrap, 1000);
  const width = Math.max(900, measured);
  const [focus, setFocus] = useState<string | null>(null);
  const colW = width / COLUMNS.length;
  const boxW = colW - 22;
  const rowH = 40;
  const byCol = COLUMNS.map((c) => nodes.filter((n) => n.type === c.type));

  // Placering: hver node søger mod gennemsnittet af sine forældres højde; overlap
  // løses ved at skubbe nedad. Det holder kæder vandrette og mindsker krydsninger.
  const pos = new Map<string, { x: number; y: number }>();
  byCol.forEach((col, ci) => {
    const desired = col.map((n, idx) => {
      const parents = edges.filter((e) => e.to === n.id).map((e) => pos.get(e.from)?.y).filter((v): v is number => v !== undefined);
      return { n, want: parents.length ? parents.reduce((s, v) => s + v, 0) / parents.length : Number.POSITIVE_INFINITY, idx };
    });
    desired.sort((x, y) => x.want - y.want || x.idx - y.idx);
    let last = 34 - rowH;
    for (const d of desired) {
      const yv = Number.isFinite(d.want) ? Math.max(d.want, last + rowH) : last + rowH;
      pos.set(d.n.id, { x: ci * colW + 8, y: yv });
      last = yv;
    }
    byCol[ci] = desired.map((d) => d.n);
  });
  const height = Math.max(...[...pos.values()].map((p) => p.y), 34) + rowH;
  const lit = focus ? pathThrough(focus, edges) : null;
  const maxChars = Math.max(12, Math.floor((boxW - 26) / 6.6));
  const trunc = (s: string) => (s.length > maxChars ? s.slice(0, maxChars - 1) + '…' : s);

  return (
    <div ref={wrap} className="w-full overflow-x-auto">
      <svg width={width} height={height} role="group" aria-label="Afhængighedsgraf. Samme indhold findes i tabelvisningen." className="block">
        {COLUMNS.map((c, i) => (
          <text key={c.type} x={i * colW + 8} y={16} className="fill-ink-muted text-[11px] font-semibold uppercase tracking-[0.1em]">
            {c.label}
          </text>
        ))}
        {edges.map((e, i) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          const x1 = a.x + boxW;
          const y1 = a.y + 14;
          const x2 = b.x;
          const y2 = b.y + 14;
          const on = !lit || (lit.has(e.from) && lit.has(e.to));
          return (
            <path
              key={i}
              d={`M${x1},${y1} C${x1 + 24},${y1} ${x2 - 24},${y2} ${x2},${y2}`}
              fill="none"
              stroke={on && lit ? '#14213A' : '#BFB4A0'}
              strokeWidth={on && lit ? 1.6 : 1}
              strokeDasharray={e.weak ? '3 3' : undefined}
              opacity={on ? 1 : 0.18}
            />
          );
        })}
        {nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const severe = n.flags.some((f) => SEVERE.includes(f));
          const flagged = n.flags.length > 0;
          const on = !lit || lit.has(n.id);
          return (
            <g
              key={n.id}
              transform={`translate(${p.x} ${p.y})`}
              opacity={on ? 1 : 0.25}
              role="button"
              tabIndex={0}
              aria-label={`${COLUMNS.find((c) => c.type === n.type)?.label}: ${n.label}. ${n.sublabel}.${n.flags.length ? ` Fund: ${n.flags.map((f) => FINDING_LABEL[f]).join(', ')}.` : ''}`}
              onMouseEnter={() => setFocus(n.id)}
              onMouseLeave={() => setFocus(null)}
              onFocus={() => setFocus(n.id)}
              onBlur={() => setFocus(null)}
              onClick={() => onOpen(n)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen(n))}
              className="cursor-pointer focus:outline-none"
            >
              <title>{`${n.label} – ${n.sublabel}`}</title>
              {focus === n.id && <rect x={-3} y={-3} width={boxW + 6} height={34} rx={4} fill="none" stroke="#14213A" strokeWidth={2} />}
              <rect width={boxW} height={28} rx={3} fill={focus === n.id ? '#FFFFFF' : '#FBF9F4'} stroke={severe ? '#B6402D' : flagged ? '#C68A1E' : '#DAD2C2'} strokeWidth={severe || flagged ? 1.6 : 1} />
              <text x={8} y={18} className="fill-ink text-[11.5px]">
                {trunc(n.label)}
              </text>
              {flagged && (
                <g transform={`translate(${boxW - 14} 9)`}>
                  {severe ? <path d="M5 0L10 5 5 10 0 5z" fill="#B6402D" /> : <path d="M5 0.6L9.6 9.2H0.4z" fill="#C68A1E" />}
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function DependencyView() {
  const { analysis, unitId, findings, data, asOf, openDetail } = useApp();
  const { route, setParams } = useRouter();
  const goal = route.query.get('mål');
  const kind = route.query.get('type') as FindingKind | null;
  const onlyFindings = route.query.get('kun') === '1';
  const view = route.query.get('visning') === 'tabel' ? 'tabel' : 'graf';
  const showAll = route.query.get('alle') === '1';

  const graph = useMemo(() => buildGraph(analysis, unitId, findings), [analysis, unitId, findings]);

  const visible = useMemo(() => {
    let keep = new Set(graph.nodes.map((n) => n.id));
    if (!showAll) {
      const minor = new Set(
        graph.nodes
          .filter(
            (n) =>
              (n.type === 'rolle' && (data.roles.find((r) => r.id === n.refId)?.criticality ?? 0) < CRITICALITY.criticalRole) ||
              (n.type === 'viden' && (data.knowledge.find((k) => k.id === n.refId)?.criticality ?? 0) < CRITICALITY.criticalKnowledge),
          )
          .map((n) => n.id),
      );
      const orphan = new Set(
        graph.nodes
          .filter((n) => n.type === 'person' && graph.edges.filter((e) => e.from === n.id || e.to === n.id).every((e) => minor.has(e.from) || minor.has(e.to)))
          .map((n) => n.id),
      );
      keep = new Set([...keep].filter((id) => !minor.has(id) && !orphan.has(id)));
    }
    if (goal) {
      const down = connected(new Set([`mål:${goal}`]), graph.edges, 'down');
      keep = new Set([...keep].filter((id) => down.has(id)));
    }
    const flaggedIds = graph.nodes.filter((n) => keep.has(n.id) && (kind ? n.flags.includes(kind) : n.flags.length > 0)).map((n) => n.id);
    if (kind || onlyFindings) {
      const paths = new Set<string>();
      for (const id of flaggedIds) for (const x of pathThrough(id, graph.edges)) paths.add(x);
      keep = new Set([...keep].filter((id) => paths.has(id)));
    }
    const nodes = graph.nodes.filter((n) => keep.has(n.id));
    const edges = graph.edges.filter((e) => keep.has(e.from) && keep.has(e.to));
    return { nodes, edges };
  }, [graph, goal, kind, onlyFindings, showAll, data.roles, data.knowledge]);

  const shownFindings = graph.findings.filter((f) => !kind || f.kind === kind);
  const open = (n: GraphNode) => {
    if (n.type === 'rolle') openDetail('rolle', n.refId);
    else if (n.type === 'kapabilitet') openDetail('kapabilitet', n.refId);
    else if (n.type === 'viden') openDetail('viden', n.refId);
    else if (n.type === 'person') {
      const role = data.assignments.find((a) => a.personId === n.refId && a.start <= asOf && (a.end === null || a.end >= asOf));
      if (role) openDetail('rolle', role.roleId);
      else {
        const k = data.knowledge.find((x) => x.holders.some((h) => h.personId === n.refId));
        if (k) openDetail('viden', k.id);
      }
    } else if (n.type === 'mål') setParams({ mål: n.refId });
  };

  // Tabelvisning: én række pr. rolle med kæden mål → kapabilitet → rolle → person → viden.
  const chainRows = visible.nodes
    .filter((n) => n.type === 'rolle')
    .map((roleNode) => {
      const caps = visible.edges.filter((e) => e.to === roleNode.id).map((e) => visible.nodes.find((n) => n.id === e.from)!).filter(Boolean);
      const goals = [...new Set(caps.flatMap((c) => visible.edges.filter((e) => e.to === c.id).map((e) => e.from)))].map((id) => visible.nodes.find((n) => n.id === id)!).filter(Boolean);
      const person = visible.edges.filter((e) => e.from === roleNode.id).map((e) => visible.nodes.find((n) => n.id === e.to)!).find(Boolean);
      const know = person ? visible.edges.filter((e) => e.from === person.id).map((e) => ({ node: visible.nodes.find((n) => n.id === e.to)!, weak: e.weak })).filter((x) => x.node) : [];
      const flags = [...new Set([...roleNode.flags, ...(person?.flags ?? []), ...know.flatMap((k) => k.node.flags)])];
      return { id: roleNode.id, roleNode, caps, goals, person, know, flags };
    });

  return (
    <div>
      <PageHeader
        eyebrow={`Modul C · ${fmtMonth(asOf)}`}
        title="Strategic Dependency Mapper™"
        lede="Hvilke strategiske mål hviler på hvilke kapabiliteter, roller, personer og vidensområder – og hvor er kæden kun ét menneske tyk?"
        actions={<Segmented label="Visning" value={view} onChange={(v) => setParams({ visning: v === 'tabel' ? 'tabel' : null })} options={[{ value: 'graf', label: 'Graf' }, { value: 'tabel', label: 'Tabel' }]} />}
      />
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <label className="flex w-full flex-col gap-1 text-2xs text-ink-muted sm:w-auto">
          Strategisk mål
          <select className="field w-full sm:w-auto" value={goal ?? ''} onChange={(e) => setParams({ mål: e.target.value || null })}>
            <option value="">Alle mål</option>
            {data.goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.code} – {g.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-full flex-col gap-1 text-2xs text-ink-muted sm:w-auto">
          Type af afhængighed
          <select className="field w-full sm:w-auto" value={kind ?? ''} onChange={(e) => setParams({ type: e.target.value || null })}>
            <option value="">Alle typer</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {FINDING_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" className="accent-[#14213A]" checked={showAll} onChange={(e) => setParams({ alle: e.target.checked ? '1' : null })} />
          Vis også roller og viden med kritikalitet under 4
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" className="accent-[#14213A]" checked={onlyFindings} onChange={(e) => setParams({ kun: e.target.checked ? '1' : null })} />
          Vis kun kæder med fund
        </label>
        {(goal || kind || onlyFindings) && (
          <button type="button" className="btn mb-0.5" onClick={() => setParams({ mål: null, type: null, kun: null })}>
            Nulstil filtre
          </button>
        )}
      </div>

      <div className="space-y-6">
        <div className="min-w-0">
          {visible.nodes.length === 0 ? (
            <EmptyState title="Ingen afhængigheder matcher filtrene" action={<button type="button" className="btn" onClick={() => setParams({ mål: null, type: null, kun: null })}>Nulstil filtre</button>} />
          ) : view === 'graf' ? (
            <Panel
              eyebrow="Graf"
              title="Afhængighedskæder"
              bodyClassName="p-3"
              footnote={
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1.5"><StatusShape status="kritisk" size={9} /> Afhængighed af én person eller koncentreret viden</span>
                  <span className="inline-flex items-center gap-1.5"><StatusShape status="sårbar" size={9} /> Øvrige fund (backup, dokumentation, genetablering)</span>
                  <span className="inline-flex items-center gap-1.5"><svg width="18" height="6" aria-hidden="true"><line x1="0" x2="18" y1="3" y2="3" stroke="#BFB4A0" strokeDasharray="3 3" /></svg> Under oplæring</span>
                  <span>Hold markøren over eller fokusér en boks for at fremhæve kæden. Klik for detaljer. På små skærme: rul vandret eller brug tabelvisningen.</span>
                </span>
              }
            >
              <Graph nodes={visible.nodes} edges={visible.edges} onOpen={open} />
            </Panel>
          ) : (
            <section className="panel" aria-labelledby="kæder-titel">
              <div className="border-b border-rule px-5 py-4">
                <h2 id="kæder-titel" className="font-serif text-lg font-semibold">
                  Afhængighedskæder som tabel
                </h2>
              </div>
              <div className="px-2 pb-2">
                <DataTable
                  caption="Afhængighedskæder: mål, kapabilitet, rolle, person og viden"
                  rows={chainRows}
                  rowKey={(r) => r.id}
                  onRowClick={(r) => open(r.roleNode)}
                  rowLabel={(r) => r.roleNode.label}
                  initialSort={{ key: 'fund', dir: 'desc' }}
                  columns={[
                    { key: 'mål', header: 'Mål', render: (r) => <span className="font-mono text-2xs">{r.goals.map((g) => g.label.split(' ')[0]).join(', ')}</span> },
                    { key: 'kap', header: 'Kapabilitet', render: (r) => <span className="text-2xs">{r.caps.map((c) => c.label).join(' · ')}</span> },
                    { key: 'rolle', header: 'Rolle', render: (r) => <span className="font-medium">{r.roleNode.label}</span>, sortValue: (r) => r.roleNode.label },
                    { key: 'person', header: 'Person', render: (r) => <span>{r.person?.label ?? <span className="text-risk">Ubesat</span>}</span> },
                    { key: 'viden', header: 'Kritisk viden', render: (r) => <span className="text-2xs">{r.know.map((k) => `${k.node.label}${k.weak ? ' (under oplæring)' : ''}`).join(' · ') || '—'}</span> },
                    {
                      key: 'fund',
                      header: 'Fund',
                      render: (r) => (
                        <ul className="space-y-0.5 text-2xs">
                          {r.flags.map((f) => (
                            <li key={f} className="flex items-center gap-1.5">
                              <StatusShape status={SEVERE.includes(f) ? 'kritisk' : 'sårbar'} size={8} />
                              {FINDING_LABEL[f]}
                            </li>
                          ))}
                          {r.flags.length === 0 && <li className="text-ink-muted">Ingen</li>}
                        </ul>
                      ),
                      sortValue: (r) => r.flags.length * 10 + r.flags.filter((f) => SEVERE.includes(f)).length * 100,
                    },
                  ]}
                />
              </div>
            </section>
          )}
        </div>
        <div>
          <Panel eyebrow="Fund" title={`${shownFindings.length} afhængigheder i ${unitId ? 'enheden' : 'organisationen'}`}>
            <ul className="grid gap-x-8 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
              {KINDS.filter((k) => !kind || k === kind).map((k) => {
                const list = shownFindings.filter((f) => f.kind === k);
                if (!list.length) return null;
                return (
                  <li key={k}>
                    <button type="button" className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold hover:underline" onClick={() => setParams({ type: kind === k ? null : k })} aria-pressed={kind === k}>
                      <span className="flex items-center gap-1.5">
                        <StatusShape status={SEVERE.includes(k) ? 'kritisk' : 'sårbar'} size={9} />
                        {FINDING_LABEL[k]}
                      </span>
                      <span className="num text-ink-muted">{list.length}</span>
                    </button>
                    <ul className="mt-1 space-y-0.5 pl-4 text-2xs text-ink-2">
                      {list.map((f) => (
                        <li key={f.key}>
                          <span className="text-ink">{f.label}</span> – {f.detail}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
