/** Handlingsplan – prioriterede handlinger med ansvar, frist, status og beregnet effekt. */
import { useMemo } from 'react';
import { DIMENSIONS } from '../model/catalog';
import { runScenario } from '../model/scenario';
import { fmtDate, fmtMonth, fmtScore, plural } from '../lib/format';
import { useApp, useLookup } from '../state/AppState';
import { type ActionEffect, useActionEffects } from '../state/derived';
import { Delta } from '../ui/Figures';
import { PageHeader, Panel } from '../ui/Layout';
import { BandBadge } from '../ui/Status';
import { DataTable } from '../ui/Table';

const STATUS_CLS = { planlagt: 'text-ink-2', igangsat: 'text-navy', forsinket: 'font-semibold text-risk', gennemført: 'text-teal' } as const;

export default function ActionsView() {
  const effects = useActionEffects();
  const { data, asOf, unitId, unit, openDetail } = useApp();
  const { roleTitle } = useLookup();

  const combined = useMemo(() => {
    const open = effects.filter((e) => e.action.status !== 'gennemført' && e.action.expectedChanges.length);
    if (!open.length) return null;
    return { count: open.length, result: runScenario(data, open.flatMap((e) => e.action.expectedChanges), asOf, unitId) };
  }, [effects, data, asOf, unitId]);

  const sumSingle = effects.reduce((s, e) => s + (e.orsDelta ?? 0), 0);
  const combinedDelta = combined && combined.result.after.score !== null && combined.result.before.score !== null ? combined.result.after.score - combined.result.before.score : null;

  return (
    <div>
      <PageHeader
        eyebrow={`Beslutningsstøtte · ${unit?.name ?? 'Hele organisationen'} · ${fmtMonth(asOf)}`}
        title="Handlingsplan"
        lede="Handlinger prioriteret efter den højeste risiko, de adresserer. Hver handlings forventede effekt er beregnet med samme model som scoren – ikke skønnet."
      />
      {combined && (
        <Panel eyebrow="Samlet effekt" title={`Hvis alle ${combined.count} åbne handlinger med modelleret effekt gennemføres`} className="mb-6">
          <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
            <p className="font-serif">
              <span className="num text-4xl font-semibold">{fmtScore(combined.result.before.score)}</span>
              <span className="mx-3 text-ink-muted" aria-hidden="true">→</span>
              <span className="sr-only"> til </span>
              <span className="num text-4xl font-semibold">{fmtScore(combined.result.after.score)}</span>
            </p>
            <Delta value={combinedDelta} suffix="ORS" />
            <p className="text-sm text-ink-2">
              {combined.result.resolvedRisks.length} {plural(combined.result.resolvedRisks.length, 'risiko', 'risici')} fjernes · {combined.result.changedRisks.filter((c) => c.risk.priority < c.before).length} får lavere prioritet
            </p>
          </div>
          <p className="mt-3 text-2xs text-ink-2">
            {combined.result.dimensionDeltas
              .filter((d) => d.delta !== null && Math.abs(d.delta) >= 0.5)
              .map((d) => `${DIMENSIONS[d.id].name} ${fmtScore(d.before)} → ${fmtScore(d.after)}`)
              .join(' · ')}
          </p>
          <p className="mt-2 text-2xs text-ink-muted">
            Den samlede effekt beregnes ved at anvende alle ændringer samtidig. Den er ikke summen af de enkelte effekter (sum: {Math.round(sumSingle)} point), fordi handlinger kan overlappe – fx når to handlinger forbedrer samme dimension, eller svaghedsloftet flytter sig.
          </p>
        </Panel>
      )}
      <section className="panel" aria-labelledby="handlinger-titel">
        <div className="border-b border-rule px-5 py-4">
          <h2 id="handlinger-titel" className="font-serif text-lg font-semibold">
            Handlinger
          </h2>
        </div>
        <div className="px-2 pb-2">
          <DataTable<ActionEffect>
            caption="Handlingsplan"
            rows={effects}
            rowKey={(e) => e.action.id}
            onRowClick={(e) => openDetail('handling', e.action.id)}
            rowLabel={(e) => e.action.title}
            empty="Ingen handlinger knyttet til risici i dette udsnit."
            columns={[
              {
                key: 'prio',
                header: 'Adresserer',
                render: (e) => (e.risks[0] ? <BandBadge band={[...e.risks].sort((a, b) => b.priority - a.priority)[0]!.band} priority={e.maxPriority} /> : <span className="text-2xs text-ink-muted">Ingen aktiv risiko</span>),
                sortValue: (e) => e.maxPriority,
              },
              {
                key: 'titel',
                header: 'Handling',
                render: (e) => (
                  <span>
                    <span className="font-medium">{e.action.title}</span>
                    <span className="block text-2xs text-ink-muted">{e.risks.map((r) => r.title).join(' · ')}</span>
                  </span>
                ),
                sortValue: (e) => e.action.title,
              },
              { key: 'ansvar', header: 'Ansvarlig rolle', render: (e) => <span className="text-2xs">{roleTitle(e.action.ownerRoleId)}</span>, sortValue: (e) => roleTitle(e.action.ownerRoleId) },
              {
                key: 'frist',
                header: 'Frist',
                render: (e) => (
                  <span className="num text-2xs">
                    {fmtDate(e.action.due)}
                    <span className="block text-ink-muted">{e.monthsToDue < 0 ? `${Math.abs(e.monthsToDue)} mdr. overskredet` : `om ${e.monthsToDue} mdr.`}</span>
                  </span>
                ),
                sortValue: (e) => e.action.due,
              },
              { key: 'status', header: 'Status', render: (e) => <span className={`text-2xs ${STATUS_CLS[e.action.status]}`}>{e.action.status}</span>, sortValue: (e) => e.action.status },
              {
                key: 'effekt',
                header: 'Forventet effekt',
                align: 'right',
                render: (e) => (e.orsDelta === null ? <span className="text-2xs text-ink-muted">Ikke modelleret</span> : <span className="text-2xs"><Delta value={e.orsDelta} suffix="ORS" /></span>),
                sortValue: (e) => e.orsDelta,
              },
              { key: 'beslutning', header: 'Beslutning', render: (e) => <span className="text-2xs font-semibold">{e.decision}</span> },
            ]}
          />
        </div>
        <p className="border-t border-rule px-5 py-3 text-2xs text-ink-muted">
          Effekter under 3 point vises som uændrede for ORS, men kan være betydelige for den enkelte risiko. Åbn handlingen for at se ændringer i dimensioner og risici.
        </p>
      </section>
    </div>
  );
}
