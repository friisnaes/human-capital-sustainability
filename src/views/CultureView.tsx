/** Modul E – Culture Infrastructure Map™: kultur som organisatorisk praksis og infrastruktur. */
import type { PracticeCategory } from '../domain/types';
import { DIMENSIONS } from '../model/catalog';
import { practiceAnchoring } from '../model/indicators';
import { practiceCarriersAt } from '../model/context';
import { valueAt } from '../model/time';
import { fmtDate, fmtMonth, fmtPct, fmtScore } from '../lib/format';
import { useApp, useLookup } from '../state/AppState';
import { PageHeader, Panel } from '../ui/Layout';
import { EmptyState, InsufficientData } from '../ui/Overlay';
import { StatusBadge, StatusShape } from '../ui/Status';
import { DataTable } from '../ui/Table';

const CATEGORIES: { id: PracticeCategory; label: string }[] = [
  { id: 'videndeling', label: 'Videndeling' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'tværgående samarbejde', label: 'Tværgående samarbejde' },
  { id: 'beslutningsrutine', label: 'Beslutningsrutiner' },
  { id: 'læringsrutine', label: 'Læringsrutiner' },
  { id: 'arbejdspraksis', label: 'Kritiske arbejdspraksisser' },
];

const ANCHOR = {
  forankret: { label: 'Forankret', status: 'robust' as const },
  delvis: { label: 'Delvist forankret', status: 'sårbar' as const },
  personbåret: { label: 'Personbåret', status: 'kritisk' as const },
};

export default function CultureView() {
  const { data, analysis, unitId, unit, asOf, ors, openDetail } = useApp();
  const { personName, roleTitle, unitShort } = useLookup();
  const inp = { ctx: analysis.ctx, scope: unitId, succession: analysis.succession, knowledge: analysis.knowledge };
  const practices = data.practices.filter((p) => p.registered <= asOf && (unitId === null || p.unitIds.includes(unitId)));
  const rows = practices.map((p) => {
    const a = practiceAnchoring(inp, p.id);
    const adh = p.adherence.filter((x) => x.date <= asOf);
    return { p, a, carriers: practiceCarriersAt(analysis.ctx, p), latest: adh[adh.length - 1] ?? null, prev: adh[adh.length - 2] ?? null, documented: valueAt(p.documented, asOf)?.value ?? false };
  });
  const d5 = ors.dimensions.find((d) => d.id === 'D5')!;
  const i53 = d5.indicators.find((i) => i.id === 'I5.3')!;
  const units = unitId ? data.units.filter((u) => u.id === unitId) : data.units;
  const firstRegistered = data.practices.reduce((m, p) => (p.registered < m ? p.registered : m), '9999-12-31');
  const single = rows.filter((r) => r.carriers.length <= 1);

  return (
    <div>
      <PageHeader
        eyebrow={`Modul E · ${fmtMonth(asOf)}`}
        title="Culture Infrastructure Map™"
        lede="Kultur behandlet som infrastruktur: de rutiner, der bærer videndeling, samarbejde, beslutninger og læring. Spørgsmålet er, om de er forankret i organisationen – eller i enkeltpersoner."
      />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Panel eyebrow="Kulturel kontinuitet (D5)" title={DIMENSIONS.D5.name} className="h-full">
            <p className="font-serif">
              <span className="num text-5xl font-semibold">{fmtScore(d5.score)}</span>
              <span className="ml-1 text-ink-muted">/100</span>
            </p>
            <div className="mt-1">{d5.score === null ? <InsufficientData reason={d5.indicators[0]?.reason} /> : <StatusBadge status={d5.status} />}</div>
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-rule pt-4 text-sm">
              {(['forankret', 'delvis', 'personbåret'] as const).map((k) => (
                <div key={k}>
                  <dt className="flex items-center gap-1.5 text-2xs text-ink-muted">
                    <StatusShape status={ANCHOR[k].status} size={9} />
                    {ANCHOR[k].label}
                  </dt>
                  <dd className="num font-serif text-2xl font-semibold">{rows.filter((r) => r.a.state === k).length}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
        <div className="lg:col-span-7">
          <Panel eyebrow="Principper" title="Hvad platformen måler – og ikke måler" className="h-full">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-teal">Måles</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-2">
                  <li>Om praksisser har formel ejer og er beskrevet</li>
                  <li>Hvor mange der kan bære dem</li>
                  <li>Om de gennemføres som planlagt (aggregeret fra kalendere)</li>
                  <li>Om nye nøglepersoner får struktureret onboarding</li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-risk">Måles aldrig</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-2">
                  <li>Indhold af beskeder, mails eller møder</li>
                  <li>Enkeltpersoners adfærd eller aktivitet</li>
                  <li>Loyalitet eller "kulturfit" som personlig score</li>
                  <li>Skjult overvågning af nogen art</li>
                </ul>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {practices.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={`Praksisregistret dækker ikke ${unit?.name ?? 'organisationen'} i ${fmtMonth(asOf)}`}>
            {asOf < firstRegistered
              ? `Registret blev etableret ${fmtDate(firstRegistered)}. Før denne dato indgår kulturel kontinuitet ikke i ORS, og øvrige dimensioner genvægtes.`
              : 'Enheden har endnu ikke registreret praksisser. Dimensionen vises som utilstrækkeligt datagrundlag og indgår ikke i enhedens ORS – den tælles ikke som nul.'}
          </EmptyState>
        </div>
      ) : (
        <>
          <section className="panel mt-6" aria-labelledby="kort-titel">
            <div className="border-b border-rule px-5 py-4">
              <h2 id="kort-titel" className="font-serif text-lg font-semibold">
                Kortet: praksisser pr. kategori og enhed
              </h2>
            </div>
            <div className="overflow-x-auto p-3">
              <table className="w-full min-w-[720px] border-separate border-spacing-1 text-2xs">
                <caption className="sr-only">Praksisser fordelt på kategori og enhed med forankringsstatus</caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-44 text-left font-semibold uppercase tracking-[0.08em] text-ink-muted">Kategori</th>
                    {units.map((u) => (
                      <th key={u.id} scope="col" className="text-left font-semibold uppercase tracking-[0.08em] text-ink-muted">
                        {u.shortName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIES.map((c) => (
                    <tr key={c.id}>
                      <th scope="row" className="py-2 pr-2 text-left align-top text-sm font-medium text-ink">
                        {c.label}
                      </th>
                      {units.map((u) => {
                        const cell = rows.filter((r) => r.p.category === c.id && r.p.unitIds.includes(u.id));
                        const registered = data.practices.some((p) => p.unitIds.includes(u.id) && p.registered <= asOf);
                        return (
                          <td key={u.id} className={`rounded-sm p-1.5 align-top ${registered ? 'bg-paper' : 'bg-[repeating-linear-gradient(135deg,transparent_0_5px,rgba(20,33,58,0.05)_5px_7px)]'}`}>
                            {!registered ? (
                              <span className="text-ink-muted">Ikke registreret</span>
                            ) : cell.length === 0 ? (
                              <span className="text-ink-faint">—</span>
                            ) : (
                              <ul className="space-y-1">
                                {cell.map((r) => (
                                  <li key={r.p.id}>
                                    <button type="button" onClick={() => openDetail('praksis', r.p.id)} className="flex w-full items-start gap-1.5 rounded-sm border border-rule bg-surface px-1.5 py-1 text-left hover:border-ink-2">
                                      <span className="mt-0.5">
                                        <StatusShape status={ANCHOR[r.a.state].status} size={8} />
                                      </span>
                                      <span>
                                        <span className="block text-ink">{r.p.name}</span>
                                        <span className="block text-ink-muted">{ANCHOR[r.a.state].label}</span>
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="mt-6 space-y-6">
            <div className="min-w-0">
              <section className="panel" aria-labelledby="praksis-titel">
                <div className="border-b border-rule px-5 py-4">
                  <h2 id="praksis-titel" className="font-serif text-lg font-semibold">
                    Praksisregister
                  </h2>
                </div>
                <div className="px-2 pb-2">
                  <DataTable<(typeof rows)[number]>
                    caption="Praksisregister"
                    rows={rows}
                    rowKey={(r) => r.p.id}
                    onRowClick={(r) => openDetail('praksis', r.p.id)}
                    rowLabel={(r) => r.p.name}
                    initialSort={{ key: 'forankring', dir: 'asc' }}
                    columns={[
                      {
                        key: 'navn',
                        header: 'Praksis',
                        render: (r) => (
                          <span>
                            <span className="font-medium">{r.p.name}</span>
                            <span className="block text-2xs text-ink-muted">{r.p.unitIds.map(unitShort).join(', ')}</span>
                          </span>
                        ),
                        sortValue: (r) => r.p.name,
                      },
                      { key: 'bet', header: 'Betydning', align: 'right', render: (r) => <span className="num">{r.p.importance}</span>, sortValue: (r) => r.p.importance },
                      {
                        key: 'forankring',
                        header: 'Forankring',
                        render: (r) => (
                          <span className="inline-flex items-center gap-1.5 text-2xs">
                            <StatusShape status={ANCHOR[r.a.state].status} size={9} />
                            {ANCHOR[r.a.state].label}
                          </span>
                        ),
                        sortValue: (r) => (r.a.state === 'personbåret' ? 0 : r.a.state === 'delvis' ? 1 : 2) * 10 - r.p.importance,
                      },
                      { key: 'bærere', header: 'Bærere', align: 'right', render: (r) => <span className={`num ${r.carriers.length <= 1 ? 'font-semibold text-risk' : ''}`}>{r.carriers.length}</span>, sortValue: (r) => r.carriers.length },
                      { key: 'ejer', header: 'Formel ejer', render: (r) => <span className="text-2xs">{r.p.ownerRoleId ? roleTitle(r.p.ownerRoleId) : <span className="text-ink-muted">Ingen</span>}</span> },
                      { key: 'besk', header: 'Beskrevet', render: (r) => <span className="text-2xs">{r.documented ? 'Ja' : 'Nej'}</span> },
                      {
                        key: 'gennem',
                        header: 'Gennemført',
                        align: 'right',
                        render: (r) =>
                          r.latest ? (
                            <span className="num text-2xs">
                              {fmtPct(r.latest.value)}
                              {r.prev && <span className="ml-1 text-ink-muted">{r.latest.value > r.prev.value + 0.02 ? '↑' : r.latest.value < r.prev.value - 0.02 ? '↓' : '→'}</span>}
                            </span>
                          ) : (
                            <span className="text-2xs text-ink-muted">—</span>
                          ),
                        sortValue: (r) => r.latest?.value ?? null,
                      },
                    ]}
                  />
                </div>
              </section>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Panel eyebrow="Afhængighed af enkelte kulturbærere" title={`${single.length} praksisser med én bærer`}>
                {single.length === 0 ? (
                  <p className="text-sm text-ink-muted">Alle praksisser har mindst to bærere.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {single.map((r) => (
                      <li key={r.p.id} className="border-b border-rule pb-2 last:border-b-0">
                        <button type="button" className="link text-left" onClick={() => openDetail('praksis', r.p.id)}>
                          {r.p.name}
                        </button>
                        <span className="block text-2xs text-ink-muted">
                          Bæres af {r.carriers[0] ? personName(r.carriers[0].personId) : 'ingen'} · betydning {r.p.importance}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <Panel eyebrow="Videreførelse" title="Onboarding af nye nøglepersoner">
                {i53.items.length === 0 ? (
                  <p className="text-sm text-ink-muted">{i53.reason}</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {i53.items.map((it) => (
                      <li key={it.key} className="flex justify-between gap-2">
                        <span>{it.label}</span>
                        <span className="shrink-0 text-2xs text-ink-2">{it.detail.replace('Onboarding: ', '')}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

