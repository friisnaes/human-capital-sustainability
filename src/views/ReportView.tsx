import type { ReactNode } from 'react';
/** Printvenlig bestyrelsesrapport – kan gemmes som PDF via browserens udskriftsdialog. */
import { DIMENSIONS, STATUS_LABEL } from '../model/catalog';
import { CURRENT_MODEL, RISK_MODEL } from '../model/config';
import { BAND_LABEL, CATEGORY_LABEL, topDistinctRisks } from '../model/risk';
import { fmtDate, fmtDelta, fmtMonth, fmtMonths, fmtPct, fmtScore, plural } from '../lib/format';
import { useApp, useLookup } from '../state/AppState';
import { useActionEffects, useKeyPersonScenario } from '../state/derived';
import { IconPrint } from '../ui/icons';
import { RISK_STATUS_LABEL } from '../ui/Status';

function Section({ n, title, children, breakBefore = false }: { n: number; title: string; children: ReactNode; breakBefore?: boolean }) {
  return (
    <section className={`mt-8 ${breakBefore ? 'print-break' : ''}`}>
      <h2 className="mb-3 border-b border-ink pb-1 font-serif text-lg font-semibold [break-after:avoid]">
        <span className="num mr-2 text-ink-muted">{n}.</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ReportView() {
  const { data, ors, unit, asOf, comparison, quality, singlePersons, risks, history } = useApp();
  const { roleTitle, personName, actions } = useLookup();
  const effects = useActionEffects().slice(0, 6);
  const kp = useKeyPersonScenario();
  const top = topDistinctRisks(risks, 5);
  const material = risks.filter((r) => r.band === 'kritisk' || r.band === 'høj');
  const delta = comparison && ors.score !== null && comparison.current.score !== null ? ors.score - comparison.current.score : null;
  const today = new Date().toISOString().slice(0, 10);
  const quarters = history.snapshots.filter((s) => ['03', '06', '09', '12'].includes(s.date.slice(5, 7)));

  return (
    <div className="mx-auto max-w-[52rem]">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-surface p-4">
        <p className="text-sm text-ink-2">Rapporten følger de valgte filtre. Brug udskriftsdialogen og vælg "Gem som PDF" for at gemme den.</p>
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          <IconPrint /> Udskriv eller gem som PDF
        </button>
      </div>

      <article className="panel bg-white px-6 py-8 sm:px-10 print:border-0 print:px-0 print:py-0">
        <header className="border-b-2 border-ink pb-4">
          <p className="inline-block rounded-sm border border-amber-mark bg-amber-soft px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.1em] text-amber">
            Fiktive demodata – ikke en virkelig virksomhed
          </p>
          <p className="eyebrow mt-4">Bestyrelsesrapport · Human Capital Sustainability™</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold">{data.organization.name}</h1>
          <p className="mt-1 text-sm text-ink-2">Organisatorisk robusthed og menneskelig kapital – {fmtMonth(asOf)}</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-2xs sm:grid-cols-4">
            <div>
              <dt className="text-ink-muted">Rapportdato</dt>
              <dd>{fmtDate(today)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Dataperiode</dt>
              <dd>{fmtMonth(asOf)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Aktive filtre</dt>
              <dd>Enhed: {unit?.name ?? 'hele organisationen'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Modelversion</dt>
              <dd>
                ORS v{CURRENT_MODEL.version} · risiko v{RISK_MODEL.version}
              </dd>
            </div>
          </dl>
        </header>

        <Section n={1} title="Sammenfatning">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
            <p className="font-serif">
              <span className="num text-5xl font-semibold">{fmtScore(ors.score)}</span>
              <span className="text-ink-muted">/100</span>
            </p>
            <div className="text-sm">
              <p className="font-semibold">{STATUS_LABEL[ors.status]}</p>
              <p className="num text-ink-2">
                {delta === null ? 'Ingen sammenligning' : `${fmtDelta(delta)} siden ${fmtMonth(comparison!.date)}${Math.abs(Math.round(delta)) < CURRENT_MODEL.changeResolution ? ' (uændret)' : ''}`}
              </p>
            </div>
            <div className="text-sm text-ink-2">
              <p className="num">Datadækning {fmtPct(ors.coverage)} · datakvalitet {quality.level}</p>
              <p className="num">{singlePersons.length} {plural(singlePersons.length, 'kritisk enkeltpersonsafhængighed', 'kritiske enkeltpersonsafhængigheder')}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed">
            {ors.capApplied
              ? `Svaghedsloftet begrænser scoren fra ${fmtScore(ors.weightedMean)} til ${fmtScore(ors.cap)}. `
              : ''}
            Svageste dimension er {ors.weakestDimension ? DIMENSIONS[ors.weakestDimension].name.toLowerCase() : '—'}. Der er {material.length} {plural(material.length, 'risiko', 'risici')} med høj eller kritisk prioritet fra {new Set(material.map((r) => r.rootKey)).size} {plural(new Set(material.map((r) => r.rootKey)).size, 'rod', 'forskellige rødder')}.
          </p>
        </Section>

        <Section n={2} title="Dimensioner">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th !px-0">Dimension</th>
                <th className="th text-right">Vægt</th>
                <th className="th text-right">Score</th>
                <th className="th">Status</th>
                <th className="th !pr-0 text-right">Dækning</th>
              </tr>
            </thead>
            <tbody>
              {ors.dimensions.map((d) => (
                <tr key={d.id}>
                  <td className="td !px-0">{DIMENSIONS[d.id].name}</td>
                  <td className="td num text-right">{fmtPct(d.weight)}</td>
                  <td className="td num text-right font-semibold">{fmtScore(d.score)}</td>
                  <td className="td">{STATUS_LABEL[d.status]}</td>
                  <td className="td num !pr-0 text-right">{fmtPct(d.coverage)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Section>

        <Section n={3} title="Centrale risici">
          <ol className="space-y-3">
            {top.map((r, i) => (
              <li key={r.id} className="avoid-break border-l-2 border-ink pl-3">
                <p className="text-sm font-semibold">
                  {i + 1}. {r.title} <span className="font-normal text-ink-muted">– {BAND_LABEL[r.band]}, prioritet {r.priority} (K{r.consequence.value} · E{r.exposure.value} · B{r.readiness.value})</span>
                </p>
                <p className="text-sm text-ink-2">{r.businessConsequence}</p>
                <p className="text-2xs text-ink-muted">
                  {CATEGORY_LABEL[r.category]} · {r.horizon.label} · ansvarlig: {roleTitle(r.treatment?.ownerRoleId ?? r.suggestedOwnerRoleId)}
                  {r.treatment ? ` · ${RISK_STATUS_LABEL[r.treatment.status]}` : ' (foreslået, ikke behandlet)'}
                </p>
                <p className="text-2xs">
                  <strong>Anbefalet handling:</strong> {r.treatment?.actionIds.map((id) => actions.get(id)?.title).filter(Boolean).join('; ') || r.recommendation}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-2xs text-ink-muted">Én risiko pr. rod. Det fulde register kan eksporteres som CSV fra Human Capital Risk Dashboard™.</p>
        </Section>

        <Section n={4} title="Prioriterede handlinger">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th !px-0">Handling</th>
                <th className="th">Ansvarlig</th>
                <th className="th">Frist</th>
                <th className="th">Status</th>
                <th className="th text-right">Effekt (ORS)</th>
                <th className="th !pr-0">Beslutning</th>
              </tr>
            </thead>
            <tbody>
              {effects.map((e) => (
                <tr key={e.action.id} className="avoid-break">
                  <td className="td !px-0">{e.action.title}</td>
                  <td className="td text-2xs">{roleTitle(e.action.ownerRoleId)}</td>
                  <td className="td num text-2xs">{fmtDate(e.action.due)}</td>
                  <td className="td text-2xs">{e.action.status}</td>
                  <td className="td num text-right text-2xs">{e.orsDelta === null ? 'ikke modelleret' : fmtDelta(e.orsDelta)}</td>
                  <td className="td !pr-0 text-2xs font-semibold">{e.decision}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Section>

        {kp && (
          <Section n={5} title="Nøglepersonsscenarie">
            <p className="text-sm">
              Hvis {personName(kp.personId)} ({kp.roleIds.map((id) => roleTitle(id)).join(', ') || 'vidensholder'}) bliver utilgængelig, ændres ORS fra {fmtScore(kp.result.before.score)} til {fmtScore(kp.result.after.score)}{kp.delta !== null && Math.abs(Math.round(kp.delta)) < CURRENT_MODEL.changeResolution ? ' – en ændring inden for modellens opløsning, dvs. uændret' : ''}. Konsekvensen ses især i de udækkede behov nedenfor. Estimeret genetableringstid: {fmtMonths(kp.result.rebuildMonths)}
            </p>
            <ul className="mt-2 list-disc pl-5 text-2xs text-ink-2">
              {kp.result.uncovered.map((u, i) => (
                <li key={i}>
                  {u.label}: {u.detail}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-2xs text-ink-muted">Scenariet er en antagelse. Der er ikke beregnet nogen sandsynlighed for afgang.</p>
          </Section>
        )}

        <Section n={kp ? 6 : 5} title="Udvikling">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th !px-0">Kvartal</th>
                <th className="th text-right">ORS (gældende model)</th>
                <th className="th text-right">Rapporteret</th>
                <th className="th !pr-0 text-right">Dækning</th>
              </tr>
            </thead>
            <tbody>
              {quarters.map((s) => (
                <tr key={s.date}>
                  <td className="td !px-0">{fmtMonth(s.date)}</td>
                  <td className="td num text-right">{fmtScore(s.current.score)}</td>
                  <td className="td num text-right">
                    {fmtScore(s.reported.score)} <span className="text-2xs text-ink-muted">(v{s.modelVersionAtTime})</span>
                  </td>
                  <td className="td num !pr-0 text-right">{fmtPct(s.current.coverage)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <ul className="mt-2 list-disc pl-5 text-2xs text-ink-2">
            {history.events.map((e, i) => (
              <li key={i}>{e.text}</li>
            ))}
          </ul>
        </Section>

        <Section n={kp ? 7 : 6} title="Datagrundlag og begrænsninger">
          <ul className="list-disc space-y-1 pl-5 text-2xs leading-relaxed text-ink-2">
            <li>Alle data er fiktive og udarbejdet til demonstration. Virksomhed, personer og tal må ikke forveksles med virkelige forhold.</li>
            <li>Scoren er en forklarlig prototype til beslutningsstøtte. Vægte og tærskler er faglige antagelser, som ikke er empirisk valideret, og scoren påviser ikke årsagssammenhænge.</li>
            <li>Datakvalitet ({quality.level}) beskriver fuldstændighed og aktualitet – ikke statistisk sikkerhed. Aktualitet {fmtPct(quality.freshness)}{quality.documentedShare !== null ? `; ${fmtPct(quality.documentedShare)} af beredskabsvurderingerne hviler på dokumenteret evidens` : ''}.</li>
            <li>Ændringer under {CURRENT_MODEL.changeResolution} point betragtes som uændrede.</li>
            <li>Platformen rangerer ikke mennesker og beregner ingen sandsynlighed for individuel afgang.</li>
          </ul>
        </Section>
        <p className="mt-8 border-t border-rule pt-3 text-2xs text-ink-muted">Human Capital Sustainability™ · demonstration med fiktive data · genereret {fmtDate(today)}</p>
      </article>
    </div>
  );
}
