/** Modul D – Leadership Pipeline Engine™: kritiske lederroller, efterfølgere og lederudvikling. */
import { useMemo } from 'react';
import type { Role } from '../domain/types';
import { CRITICALITY } from '../model/config';
import type { RoleSuccession } from '../model/succession';
import { findingInScope } from '../model/dependencies';
import { fmtDate, fmtMonth, fmtPct } from '../lib/format';
import { useRouter } from '../lib/router';
import { useApp, useLookup } from '../state/AppState';
import { DefList, PageHeader, Panel } from '../ui/Layout';
import { Segmented } from '../ui/Overlay';
import { DataTable } from '../ui/Table';
import { BasisMark, Readiness } from './common';

type Row = { role: Role; s: RoleSuccession };

function Definitions() {
  return (
    <Panel eyebrow="Definitioner" title="Hvad betyder beredskab?">
      <DefList
        items={[
          [<Readiness key="n" value="nu" />, 'Kan overtage rollen nu med normal introduktion. Bruges som nødberedskab.'],
          [<Readiness key="1" value="1-2" />, 'Forventes klar inden for 1–2 år med planlagt udvikling og uddelegeret ansvar.'],
          [<Readiness key="3" value="3-5" />, 'Forventes klar inden for 3–5 år. Tæller ikke som dækning i successionsberedskabet.'],
          [<BasisMark key="d" basis="dokumenteret" />, 'Vurderingen henviser til registreret evidens: udviklingsforløb, uddelegeret ansvar, leverancer eller certificeringer.'],
          [<BasisMark key="v" basis="vurdering" />, 'Vurderingen hviler på en leders skøn uden registreret evidens. Den tæller med, men sænker datakvaliteten.'],
        ]}
      />
      <p className="mt-4 text-2xs text-ink-muted">
        Effektiv dækning: hver kandidat kan kun dække ét behov ad gangen. Kandidater fordeles på tværs af organisationen, så de mest kritiske roller dækkes først. Platformen rangerer ikke kandidater og beregner ingen samlet værdi af mennesker.
      </p>
    </Panel>
  );
}

export default function PipelineView() {
  const { data, analysis, unitId, asOf, openDetail, findings } = useApp();
  const { personName, unitShort, roleTitle } = useLookup();
  const { route, setParams } = useRouter();
  const scopeView = (route.query.get('vis-roller') ?? 'kritiske') as 'kritiske' | 'ledere' | 'gab';

  const rows: Row[] = useMemo(
    () =>
      data.roles
        .filter((r) => unitId === null || r.unitId === unitId)
        .map((role) => ({ role, s: analysis.succession.roles.get(role.id)! }))
        .filter(({ role, s }) =>
          scopeView === 'kritiske' ? role.criticality >= CRITICALITY.criticalRole : scopeView === 'ledere' ? role.leadership : role.criticality >= CRITICALITY.criticalRole && (!s.effective2y || !s.hasPlan),
        ),
    [data.roles, analysis, unitId, scopeView],
  );

  const critical = data.roles.filter((r) => (unitId === null || r.unitId === unitId) && r.criticality >= CRITICALITY.criticalRole);
  const withPlan = critical.filter((r) => analysis.succession.roles.get(r.id)?.hasPlan);
  const cov2 = withPlan.filter((r) => analysis.succession.roles.get(r.id)?.effective2y).length;
  const covNow = withPlan.filter((r) => analysis.succession.roles.get(r.id)?.effectiveNow).length;
  const nominal2 = withPlan.filter((r) => analysis.succession.roles.get(r.id)?.nominal2y).length;
  const shared = [...analysis.succession.shared.entries()].filter(([, roles]) => roles.some((id) => unitId === null || data.roles.find((r) => r.id === id)?.unitId === unitId));
  const uncovered = critical.filter((r) => !analysis.succession.roles.get(r.id)?.hasPlan);

  // Ledere, der udvikler ledere (fra indikator I4.1).
  const ors = useApp().ors;
  const i41 = ors.dimensions.find((d) => d.id === 'D4')!.indicators.find((i) => i.id === 'I4.1')!;
  const leaderRows = i41.items;

  return (
    <div>
      <PageHeader
        eyebrow={`Modul D · ${fmtMonth(asOf)}`}
        title="Leadership Pipeline Engine™"
        lede="Hvilke kritiske roller har en realistisk efterfølger, hvor deles samme efterfølger af flere behov, og udvikler lederne faktisk nye ledere?"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel eyebrow="Successionsberedskab" title="Kritiske roller (kritikalitet 4–5)" className="h-full">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              <div>
                <dt className="text-2xs text-ink-muted">Kritiske roller</dt>
                <dd className="num font-serif text-3xl font-semibold">{critical.length}</dd>
                <dd className="text-2xs text-ink-muted">{uncovered.length} uden registreret plan</dd>
              </div>
              <div>
                <dt className="text-2xs text-ink-muted">Dækket inden for 2 år</dt>
                <dd className="num font-serif text-3xl font-semibold">
                  {cov2}
                  <span className="text-base text-ink-muted">/{withPlan.length}</span>
                </dd>
                <dd className="text-2xs text-ink-muted">nominelt {nominal2} – effektivt {cov2}</dd>
              </div>
              <div>
                <dt className="text-2xs text-ink-muted">Klar nu (nødberedskab)</dt>
                <dd className="num font-serif text-3xl font-semibold">
                  {covNow}
                  <span className="text-base text-ink-muted">/{withPlan.length}</span>
                </dd>
                <dd className="text-2xs text-ink-muted">{withPlan.length ? fmtPct(covNow / withPlan.length) : '—'} af roller med plan</dd>
              </div>
              <div>
                <dt className="text-2xs text-ink-muted">Kandidater på flere roller</dt>
                <dd className="num font-serif text-3xl font-semibold">{shared.length}</dd>
                <dd className="text-2xs text-ink-muted">kan kun dække ét behov ad gangen</dd>
              </div>
            </dl>
            {shared.length > 0 && (
              <div className="mt-5 border-t border-rule pt-4">
                <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-muted">Samme efterfølger til flere samtidige behov</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {shared.map(([p, roleIds]) => (
                    <li key={p}>
                      <span className="font-medium">{personName(p)}</span>
                      <span className="text-ink-2"> er kandidat til </span>
                      {roleIds.map((id, i) => (
                        <span key={id}>
                          {i > 0 && (i === roleIds.length - 1 ? ' og ' : ', ')}
                          <button type="button" className="link" onClick={() => openDetail('rolle', id)}>
                            {roleTitle(id)}
                          </button>
                        </span>
                      ))}
                      <span className="text-ink-2">. Effektivt tildelt: {roleTitle(roleIds.find((id) => analysis.succession.roles.get(id)?.effective2y === p) ?? null) || '—'}.</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        </div>
        <div className="lg:col-span-5">
          <Definitions />
        </div>
      </div>

      <section className="panel mt-6" aria-labelledby="roller-titel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-4">
          <h2 id="roller-titel" className="font-serif text-lg font-semibold">
            Roller og efterfølgere
          </h2>
          <Segmented
            label="Vis roller"
            value={scopeView}
            onChange={(v) => setParams({ 'vis-roller': v === 'kritiske' ? null : v })}
            options={[
              { value: 'kritiske', label: 'Kritiske roller' },
              { value: 'gab', label: 'Kun gab' },
              { value: 'ledere', label: 'Alle lederroller' },
            ]}
          />
        </div>
        <div className="px-2 pb-2">
          <DataTable<Row>
            caption="Roller med efterfølgere og beredskab"
            rows={rows}
            rowKey={(r) => r.role.id}
            onRowClick={(r) => openDetail('rolle', r.role.id)}
            rowLabel={(r) => r.role.title}
            initialSort={{ key: 'krit', dir: 'desc' }}
            empty="Ingen roller i dette udsnit."
            columns={[
              {
                key: 'rolle',
                header: 'Rolle',
                render: (r) => (
                  <span>
                    <span className="font-medium">{r.role.title}</span>
                    <span className="block text-2xs text-ink-muted">
                      {unitShort(r.role.unitId)} · {r.s.holderId ? personName(r.s.holderId) : <span className="text-risk">ubesat</span>}
                    </span>
                  </span>
                ),
                sortValue: (r) => r.role.title,
              },
              { key: 'krit', header: 'Krit.', align: 'right', render: (r) => <span className="num">{r.role.criticality}</span>, sortValue: (r) => r.role.criticality * 100 - (r.s.effective2y ? 1 : 0) },
              {
                key: 'kand',
                header: 'Kandidater',
                render: (r) =>
                  !r.s.hasPlan ? (
                    <span className="text-2xs text-amber">Ingen registreret plan (manglende data)</span>
                  ) : r.s.candidates.length === 0 ? (
                    <span className="text-2xs text-risk">Ingen kandidater</span>
                  ) : (
                    <ul className="space-y-1">
                      {r.s.candidates.map((c) => (
                        <li key={c.personId} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs">
                          <span className="text-sm text-ink">{personName(c.personId)}</span>
                          <Readiness value={c.readiness} />
                          <BasisMark basis={c.basis} />
                          {c.alsoCandidateFor.length > 0 && <span className="text-amber">også til {c.alsoCandidateFor.map((id) => roleTitle(id)).join(', ')}</span>}
                        </li>
                      ))}
                    </ul>
                  ),
              },
              {
                key: 'eff',
                header: 'Effektiv dækning',
                render: (r) =>
                  !r.s.hasPlan ? (
                    <span className="text-2xs text-ink-muted">Ukendt</span>
                  ) : (
                    <span className="text-2xs">
                      <span className="block">≤ 2 år: {r.s.effective2y ? <strong className="font-semibold">{personName(r.s.effective2y)}</strong> : <span className="font-semibold text-risk">ingen</span>}</span>
                      <span className="block">Nu: {r.s.effectiveNow ? personName(r.s.effectiveNow) : <span className="text-ink-muted">ingen</span>}</span>
                      {r.s.lostToDoubleBooking2y && <span className="block text-amber">Tildelt en højere prioriteret rolle</span>}
                    </span>
                  ),
                sortValue: (r) => (r.s.effective2y ? 2 : 0) + (r.s.effectiveNow ? 1 : 0),
              },
              {
                key: 'behov',
                header: 'Udviklingsbehov',
                render: (r) => <span className="text-2xs text-ink-2">{[...new Set(r.s.candidates.flatMap((c) => c.developmentNeeds))].slice(0, 3).join(' · ') || '—'}</span>,
              },
              { key: 'review', header: 'Review', render: (r) => <span className="num text-2xs">{fmtDate(r.s.lastReview)}</span>, sortValue: (r) => r.s.lastReview },
            ]}
          />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel
            eyebrow="Ledere, der udvikler ledere"
            title="Observerbar lederudvikling"
            bodyClassName="px-2 pb-2"
            footnote="Måles på observerbare forhold: dokumenterede udviklingsforløb og uddelegeret ansvar for kandidater inden for de seneste 12 måneder. Lederroller uden registreret plan regnes som manglende data."
          >
            <DataTable
              caption="Lederroller og dokumenteret udvikling af efterfølgere"
              rows={leaderRows}
              rowKey={(r) => r.key}
              onRowClick={(r) => r.ref && openDetail('rolle', r.ref.id)}
              rowLabel={(r) => r.label}
              dense
              columns={[
                { key: 'l', header: 'Lederrolle', render: (r) => <span className="font-medium">{r.label}</span>, sortValue: (r) => r.label },
                {
                  key: 'v',
                  header: 'Udvikler efterfølger',
                  render: (r) => (r.value === null ? <span className="text-2xs text-amber">Manglende data</span> : r.value === 100 ? <span className="text-2xs font-semibold text-teal">Ja</span> : <span className="text-2xs font-semibold text-risk">Nej</span>),
                  sortValue: (r) => r.value,
                },
                { key: 'd', header: 'Grundlag', render: (r) => <span className="text-2xs text-ink-2">{r.detail}</span> },
              ]}
            />
          </Panel>
        </div>
        <div className="lg:col-span-5">
          <Panel eyebrow="Kritiske enkeltpersoner" title="Roller uden effektiv backup">
            <ul className="space-y-2 text-sm">
              {findings
                .filter((f) => f.kind === 'utilstrækkelig backup' && findingInScope(f, unitId))
                .map((f) => (
                  <li key={f.key} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-2 last:border-b-0">
                    <button type="button" className="link text-left" onClick={() => openDetail('rolle', f.subject.id)}>
                      {f.label}
                    </button>
                    <span className="text-2xs text-ink-muted">{f.detail}</span>
                  </li>
                ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
