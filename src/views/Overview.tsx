/** Direktionsoverblik: robusthed, udvikling, de vigtigste sårbarheder og beslutninger. */
import type { Id } from '../domain/types';
import type { ReactNode } from 'react';
import { DIMENSIONS, STATUS_LABEL } from '../model/catalog';
import { CURRENT_MODEL } from '../model/config';
import { CATEGORY_LABEL, topDistinctRisks, type Risk } from '../model/risk';
import type { OrsResult, Status } from '../model/ors';
import { fmtDate, fmtMonth, fmtMonths, fmtNumber, fmtPct, fmtScore, plural } from '../lib/format';
import { Link, useRouter } from '../lib/router';
import { useApp, useLookup } from '../state/AppState';
import { useActionEffects, useGoalExposure, useKeyPersonScenario } from '../state/derived';
import { HistoryChart } from '../ui/charts/HistoryChart';
import { CoverageText, Delta, ScoreBar } from '../ui/Figures';
import { IconArrow } from '../ui/icons';
import { PageHeader, Panel } from '../ui/Layout';
import { EmptyState, InfoTip, InsufficientData } from '../ui/Overlay';
import { BandBadge, RiskStatusText, StatusBadge, StatusShape } from '../ui/Status';
import { DemoNotice, GoalChips } from './common';

const HEADLINE: Record<Status, string> = {
  robust: 'Robustheden er høj',
  tilstrækkelig: 'Robustheden er tilstrækkelig',
  sårbar: 'Robustheden er sårbar',
  kritisk: 'Robustheden er kritisk lav',
  utilstrækkelig: 'Datagrundlaget er utilstrækkeligt til en samlet score',
};

/** Overskrift bygget af status og de faktiske sårbarheder i udsnittet. */
function headline(status: Status, singlePersons: number, criticalRisks: number): string {
  const base = HEADLINE[status];
  if (status === 'utilstrækkelig') return base;
  const joiner = status === 'robust' || status === 'tilstrækkelig' ? ' – men ' : ' – og ';
  if (singlePersons > 0) return `${base}${joiner}${singlePersons} ${singlePersons === 1 ? 'person bærer' : 'personer bærer'} kritisk viden eller roller alene`;
  if (criticalRisks > 0) return `${base}${joiner}${criticalRisks} ${criticalRisks === 1 ? 'risiko er kritisk' : 'risici er kritiske'}`;
  return `${base} – uden kritiske enkeltpersonsafhængigheder`;
}

const QUALITY_LABEL = { høj: 'Høj', middel: 'Middel', lav: 'Lav' } as const;

function OrsHero() {
  const { ors, comparison, quality, singlePersons } = useApp();
  const delta = comparison && ors.score !== null && comparison.current.score !== null ? ors.score - comparison.current.score : null;
  const weakest = ors.weakestDimension ? DIMENSIONS[ors.weakestDimension] : null;
  const weakestScore = ors.dimensions.find((d) => d.id === ors.weakestDimension)?.score ?? null;
  return (
    <Panel eyebrow="Organizational Resilience Score™" title="Organisatorisk robusthed" className="h-full" bodyClassName="px-5 pb-5 pt-4">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
        <p className="font-serif leading-none text-ink">
          <span className="num text-[4.75rem] font-semibold tracking-[-0.03em]">{fmtScore(ors.score)}</span>
          <span className="ml-1 text-xl text-ink-muted">/100</span>
        </p>
        <div className="mb-2 flex flex-col gap-1.5">
          <StatusBadge status={ors.status} size="md" />
          <span className="text-sm">
            <Delta value={delta} suffix={comparison ? `siden ${fmtMonth(comparison.date)}` : undefined} />
          </span>
        </div>
      </div>
      {ors.score === null && (
        <p className="mt-3">
          <InsufficientData reason={`kun ${fmtPct(ors.weightCoverage)} af dimensionsvægten har en forsvarlig score`} />
        </p>
      )}
      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-rule pt-4 text-sm">
        <div>
          <dt className="text-2xs text-ink-muted">Datadækning</dt>
          <dd className="num mt-0.5 font-medium">{fmtPct(ors.coverage)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-2xs text-ink-muted">
            Datakvalitet
            <InfoTip label="Datakvalitet">
              Datakvalitet beskriver, hvor fuldstændige, aktuelle og dokumenterede data er. Den er adskilt fra scoren og er ikke et udtryk for statistisk sikkerhed. Aktualitet {fmtPct(quality.freshness)}
              {quality.documentedShare !== null ? `, dokumenterede beredskabsvurderinger ${fmtPct(quality.documentedShare)}` : ''}.
            </InfoTip>
          </dt>
          <dd className="mt-0.5 font-medium">{QUALITY_LABEL[quality.level]}</dd>
        </div>
        <div>
          <dt className="text-2xs text-ink-muted">Enkeltpersons­afhængigheder</dt>
          <dd className="mt-0.5 font-medium">
            <Link to="/afhaengigheder" params={{ type: 'enkeltperson' }} className="link num">
              {singlePersons.length} {singlePersons.length === 1 ? 'person' : 'personer'}
            </Link>
          </dd>
        </div>
      </dl>
      {ors.score !== null && weakest && (
        <p className="mt-4 text-2xs leading-relaxed text-ink-2">
          {ors.capApplied ? (
            <>
              <strong className="font-semibold text-ink">Svaghedsloft anvendt:</strong> gennemsnittet er {fmtScore(ors.weightedMean)}, men scoren begrænses til {fmtScore(ors.cap)}, fordi {weakest.name.toLowerCase()} kun er {fmtScore(weakestScore)}.
            </>
          ) : (
            <>
              Svageste dimension er {weakest.name.toLowerCase()} ({fmtScore(weakestScore)}). Svaghedsloftet ({fmtScore(ors.cap)}) begrænser ikke scoren i denne periode.
            </>
          )}{' '}
          <Link to="/ors" className="link">
            Se hele beregningen
          </Link>
        </p>
      )}
    </Panel>
  );
}

function Contributions({ ors }: { ors: OrsResult }) {
  const scoredW = ors.dimensions.filter((d) => d.score !== null).reduce((s, d) => s + d.weight, 0);
  return (
    <Panel
      eyebrow="Dimensionernes bidrag"
      title="Hvad scoren består af"
      className="h-full"
      footnote={
        <>
          Bidrag = vægt × dimensionsscore ÷ samlet vægt for dimensioner med score. Bidragene er afrundede og kan afvige ±1 fra summen. Lodret streg i bjælken markerer statusgrænserne 45, 60 og 75.
        </>
      }
    >
      <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Dimensioner, vægt, score og bidrag til ORS</caption>
        <thead>
          <tr>
            <th className="th !px-0">Dimension</th>
            <th className="th text-right">Vægt</th>
            <th className="th hidden w-[38%] min-w-[7rem] sm:table-cell">
              <span className="sr-only">Score som bjælke</span>
            </th>
            <th className="th text-right">Score</th>
            <th className="th hidden !pr-0 text-right sm:table-cell">Bidrag</th>
          </tr>
        </thead>
        <tbody>
          {ors.dimensions.map((d) => {
            const contribution = d.score !== null && scoredW > 0 ? (d.weight * d.score) / scoredW : null;
            return (
              <tr key={d.id}>
                <td className="td !px-0">
                  <Link to="/ors" params={{ dim: d.id }} className="link font-medium">
                    {DIMENSIONS[d.id].name}
                  </Link>
                  <div className="mt-0.5">
                    {d.score === null ? <InsufficientData /> : <StatusBadge status={d.status} />}
                  </div>
                </td>
                <td className="td num text-right text-ink-2">{fmtPct(d.weight)}</td>
                <td className="td hidden !align-middle sm:table-cell">
                  <ScoreBar score={d.score} label={DIMENSIONS[d.id].name} />
                </td>
                <td className="td num text-right font-semibold">{fmtScore(d.score)}</td>
                <td className="td num hidden !pr-0 text-right text-ink-2 sm:table-cell">{contribution === null ? 'udeladt' : `${fmtNumber(Math.round(contribution))} p.`}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="pt-3 text-2xs text-ink-muted" colSpan={2}>
              Vægtet gennemsnit {fmtScore(ors.weightedMean)} · loft {fmtScore(ors.cap)} (svageste + {CURRENT_MODEL.weaknessCapPoints})
            </td>
            <td className="hidden sm:table-cell" />
            <td className="num pt-3 text-right font-semibold">
              <span className="sm:hidden">ORS {fmtScore(ors.score)}</span>
            </td>
            <td className="num hidden pt-3 text-right font-semibold sm:table-cell">ORS {fmtScore(ors.score)}</td>
          </tr>
        </tfoot>
      </table>
      </div>
    </Panel>
  );
}

function RiskCard({ risk, rank }: { risk: Risk; rank: number }) {
  const { openDetail } = useApp();
  const { unitShort, roleTitle, actions } = useLookup();
  const action = risk.treatment?.actionIds.map((id) => actions.get(id)).find(Boolean);
  const owner = risk.treatment?.ownerRoleId ?? risk.suggestedOwnerRoleId;
  return (
    <li className="h-full">
      <button
        type="button"
        onClick={() => openDetail('risiko', risk.id)}
        className="group flex h-full w-full flex-col rounded-md border border-rule bg-surface p-5 text-left shadow-panel transition-colors hover:border-ink-2"
        aria-label={`Sårbarhed ${rank}: ${risk.title}. Åbn forklaring og data.`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="font-serif text-3xl font-semibold leading-none text-ink-faint">{rank}</span>
          <BandBadge band={risk.band} priority={risk.priority} />
        </div>
        <h3 className="mt-3 font-serif text-[1.15rem] font-semibold leading-snug text-ink group-hover:underline group-hover:decoration-ink/30 group-hover:underline-offset-4">{risk.title}</h3>
        <p className="mt-1 text-2xs text-ink-muted">
          {CATEGORY_LABEL[risk.category]} · {unitShort(risk.unitId)}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">{risk.businessConsequence}</p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-2xs">
          <dt className="text-ink-muted">Mål</dt>
          <dd>
            <GoalChips goalIds={risk.goalIds} />
          </dd>
          <dt className="text-ink-muted">Horisont</dt>
          <dd className="text-ink-2">{risk.horizon.label}</dd>
          <dt className="text-ink-muted">Ansvarlig</dt>
          <dd className="text-ink-2">
            {roleTitle(owner)}
            {!risk.treatment && <span className="text-ink-muted"> (foreslået)</span>}
          </dd>
          <dt className="text-ink-muted">Status</dt>
          <dd className="text-ink-2">
            <RiskStatusText status={risk.treatment?.status ?? null} />
          </dd>
        </dl>
        <p className="mt-auto border-t border-rule pt-3 text-2xs leading-relaxed text-ink-2">
          <span className="font-semibold text-ink">Anbefalet handling: </span>
          {action ? action.title : risk.recommendation}
        </p>
      </button>
    </li>
  );
}

function TopRisks() {
  const { risks } = useApp();
  const top = topDistinctRisks(risks, 3);
  const critical = risks.filter((r) => r.band === 'kritisk');
  const roots = new Set(risks.map((r) => r.rootKey)).size;
  return (
    <section aria-labelledby="sårbarheder-titel" className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">Human Capital Risk Dashboard™</p>
          <h2 id="sårbarheder-titel" className="mt-1 font-serif text-xl font-semibold">
            De tre væsentligste sårbarheder
          </h2>
        </div>
        <p className="text-2xs text-ink-muted">
          {risks.length} {plural(risks.length, 'risiko', 'risici')} fra {roots} {plural(roots, 'rod', 'forskellige rødder')} · {critical.length} {plural(critical.length, 'kritisk', 'kritiske')} ·{' '}
          <Link to="/risici" className="link">
            Se risikoregistret
          </Link>
        </p>
      </div>
      {top.length === 0 ? (
        <EmptyState title="Ingen beregnede risici i udsnittet">Der er ingen roller, vidensområder, kapabiliteter eller praksisser, der opfylder modellens risikokriterier.</EmptyState>
      ) : (
        <ol className="grid gap-4 md:grid-cols-3">
          {top.map((r, i) => (
            <RiskCard key={r.id} risk={r} rank={i + 1} />
          ))}
        </ol>
      )}
      <p className="mt-2 text-2xs text-ink-muted">Én risiko pr. rod: står samme person bag flere risici, vises kun den højest prioriterede her.</p>
    </section>
  );
}

function ExposedGoals() {
  const goals = useGoalExposure();
  const { navigate } = useRouter();
  return (
    <Panel eyebrow="Strategisk eksponering" title="Hvilke mål er eksponeret" className="h-full" bodyClassName="px-5 py-2">
      {goals.length === 0 ? (
        <EmptyState title="Ingen strategiske mål i udsnittet" />
      ) : (
        <ul>
          {goals.map((g) => (
            <li key={g.goal.id} className="border-b border-rule py-3 last:border-b-0">
              <button
                type="button"
                className="group flex w-full items-start justify-between gap-3 text-left"
                onClick={() => navigate('/risici', { mål: g.goal.id })}
                aria-label={`${g.goal.code} ${g.goal.title}: se ${g.risks.length} ${plural(g.risks.length, 'risiko', 'risici')}`}
              >
                <span>
                  <span className="font-mono text-2xs text-ink-muted">{g.goal.code}</span>
                  <span className="block font-medium leading-snug text-ink group-hover:underline group-hover:underline-offset-4">{g.goal.title}</span>
                  {g.nextMilestone && (
                    <span className={`mt-1 block text-2xs ${g.nextMilestone.overdue ? 'text-risk' : 'text-ink-muted'}`}>
                      Næste milepæl: {g.nextMilestone.title}, {fmtDate(g.nextMilestone.planned)}
                      {g.nextMilestone.overdue ? ' – overskredet' : ''}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {g.topBand ? <BandBadge band={g.topBand} /> : <span className="text-2xs text-ink-muted">Ingen risici</span>}
                  <span className="num text-2xs text-ink-muted">
                    {g.risks.length} {plural(g.risks.length, 'risiko', 'risici')} · {g.roots} {plural(g.roots, 'rod', 'rødder')}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function KeyPerson() {
  const kp = useKeyPersonScenario();
  const { personName, roleTitle } = useLookup();
  const { navigate } = useRouter();
  if (!kp) {
    return (
      <Panel eyebrow="Nøglepersonsscenarie" title="Ingen kritiske enkeltpersonsafhængigheder" className="h-full">
        <p className="text-sm text-ink-2">I det valgte udsnit er der ingen personer, hvis fravær alene efterlader kritisk viden eller en kritisk rolle uden effektiv backup.</p>
      </Panel>
    );
  }
  const r = kp.result;
  const dims = r.dimensionDeltas.filter((d) => d.delta !== null && Math.abs(d.delta) >= 0.5).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0));
  return (
    <Panel
      eyebrow="Nøglepersonsscenarie"
      title={`Hvis ${personName(kp.personId)} bliver utilgængelig`}
      className="h-full"
      footnote="Personen står bag den højest prioriterede personbundne risiko. Der er ikke beregnet nogen sandsynlighed for afgang – scenariet er en eksplicit antagelse. Kandidater, der er klar nu, antages at rykke op."
      actions={
        <button type="button" className="btn" onClick={() => navigate('/scenarier', { s: 'nøgleperson', p: kp.personId, prom: '1' })}>
          Åbn i scenariesimulering <IconArrow />
        </button>
      }
    >
      <p className="text-sm text-ink-2">{kp.roleIds.length ? kp.roleIds.map((id) => roleTitle(id)).join(', ') : 'Ingen nøglerolle – vidensholder'}</p>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <p className="font-serif">
          <span className="num text-3xl font-semibold">{fmtScore(r.before.score)}</span>
          <span className="mx-2 text-ink-muted" aria-hidden="true">→</span>
          <span className="sr-only"> til </span>
          <span className="num text-3xl font-semibold">{fmtScore(r.after.score)}</span>
        </p>
        <Delta value={kp.delta} suffix="ORS" />
        <p className="text-sm">
          <span className="text-ink-muted">Genetablering: </span>
          <strong className="num font-semibold">{fmtMonths(r.rebuildMonths)}</strong>
        </p>
      </div>
      {dims.length > 0 && (
        <p className="mt-2 text-2xs text-ink-2">
          Berørte dimensioner: {dims.map((d) => `${DIMENSIONS[d.id].short} ${fmtScore(d.before)}→${fmtScore(d.after)}`).join(' · ')}
        </p>
      )}
      <h3 className="mt-4 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-muted">Udækkede behov</h3>
      <ul className="mt-2 space-y-1.5 text-sm">
        {r.uncovered.slice(0, 5).map((u, i) => (
          <li key={i} className="flex items-start justify-between gap-3 border-b border-rule pb-1.5 last:border-b-0">
            <span>
              <span className="font-medium">{u.label}</span>
              <span className="block text-2xs text-ink-muted">{u.detail}</span>
            </span>
            <span className="num shrink-0 text-2xs text-ink-2">{u.rebuildMonths === null ? u.kind : fmtMonths(u.rebuildMonths)}</span>
          </li>
        ))}
        {r.uncovered.length === 0 && <li className="text-ink-muted">Ingen udækkede behov.</li>}
      </ul>
    </Panel>
  );
}

function Decisions() {
  const effects = useActionEffects().slice(0, 5);
  const { risks, openDetail } = useApp();
  const { roleTitle } = useLookup();
  const untreated = risks.filter((r) => !r.treatment && (r.band === 'kritisk' || r.band === 'høj'));
  return (
    <Panel
      eyebrow="Beslutninger"
      title="Prioriterede handlinger"
      className="h-full"
      bodyClassName="px-5 pb-4 pt-1"
      actions={
        <Link to="/handlinger" className="btn">
          Hele handlingsplanen <IconArrow />
        </Link>
      }
      footnote="Prioriteret efter den højeste risiko, handlingen adresserer. Forventet effekt er beregnet ved at anvende handlingens ændringer på en kopi af data med samme model."
    >
      {effects.length === 0 ? (
        <EmptyState title="Ingen handlinger i udsnittet" />
      ) : (
        <ol>
          {effects.map((e, i) => (
            <li key={e.action.id} className="grid grid-cols-[1.5rem_1fr] gap-x-2 border-b border-rule py-3 last:border-b-0">
              <span className="num pt-0.5 font-serif text-sm font-semibold text-ink-faint">{i + 1}</span>
              <div>
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <button type="button" className="link text-left font-medium" onClick={() => openDetail('handling', e.action.id)}>
                    {e.action.title}
                  </button>
                  <span className="num text-2xs text-ink-2">
                    {e.orsDelta === null ? 'Effekt ikke modelleret' : <Delta value={e.orsDelta} suffix="ORS" />}
                  </span>
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-2xs text-ink-muted">
                  <span>Ansvarlig: {roleTitle(e.action.ownerRoleId)}</span>
                  <span>Frist: {fmtDate(e.action.due)}</span>
                  <span className={e.action.status === 'forsinket' ? 'font-semibold text-risk' : ''}>Status: {e.action.status}</span>
                  {e.risks[0] && <BandBadge band={e.risks[0].band} priority={e.maxPriority} />}
                </p>
                <p className="mt-1 text-2xs font-semibold text-ink">Beslutning: {e.decision}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      {untreated.length > 0 && (
        <div className="mt-3 rounded-sm border border-rule bg-paper px-3 py-2.5">
          <p className="text-2xs font-semibold text-ink">Beslutning: udpeg ansvarlig for {untreated.length} {untreated.length === 1 ? 'risiko' : 'risici'} uden behandling</p>
          <ul className="mt-1 space-y-0.5 text-2xs text-ink-2">
            {untreated.slice(0, 4).map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <StatusShape status={r.band === 'kritisk' ? 'kritisk' : 'sårbar'} size={8} />
                <OpenRisk id={r.id}>{r.title}</OpenRisk>
                <span className="text-ink-muted">– foreslået: {roleTitle(r.suggestedOwnerRoleId)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

function OpenRisk({ id, children }: { id: Id; children: ReactNode }) {
  const { openDetail } = useApp();
  return (
    <button type="button" className="link text-left" onClick={() => openDetail('risiko', id)}>
      {children}
    </button>
  );
}

export function Overview() {
  const app = useApp();
  const { data, ors, unit, unitOrs, history, asOf, isLatest } = app;
  const scored = unitOrs.filter((u) => u.ors.score !== null).sort((a, b) => b.ors.score! - a.ors.score!);
  const strongest = scored[0];
  const weakest = scored[scored.length - 1];
  const prefix = unit ? `${unit.name}: ` : '';
  const goalExposure = useGoalExposure();
  const exposed = goalExposure.filter((g) => g.topBand === 'kritisk' || g.topBand === 'høj').length;
  const goalsTotal = goalExposure.length;

  return (
    <div>
      <PageHeader
        eyebrow={`Direktionsoverblik · ${fmtMonth(asOf)}${isLatest ? '' : ' (historisk periode)'}`}
        productName="Human Capital Sustainability™"
        title={`${prefix}${headline(ors.status, app.singlePersons.length, app.risks.filter((r) => r.band === 'kritisk').length)}`}
        lede={
          unit ? (
            <>
              {unit.description} Scoren er {STATUS_LABEL[ors.status].toLowerCase()} ({fmtScore(ors.score)}). {app.singlePersons.length} {plural(app.singlePersons.length, 'kritisk enkeltpersonsafhængighed', 'kritiske enkeltpersonsafhængigheder')}; {exposed} af {goalsTotal} berørte strategiske mål er eksponeret med høj eller kritisk risiko.
            </>
          ) : (
            strongest &&
            weakest && (
              <>
                {strongest.unit.name} er stærkest ({fmtScore(strongest.ors.score)}). {weakest.unit.name} er svagest ({fmtScore(weakest.ors.score)})
                {weakest.unit.growthCritical ? ' og samtidig vækstkritisk' : ''}. {app.singlePersons.length} {plural(app.singlePersons.length, 'kritisk enkeltpersonsafhængighed', 'kritiske enkeltpersonsafhængigheder')}; {exposed} af {goalsTotal} strategiske mål er eksponeret med høj eller kritisk risiko.
              </>
            )
          )
        }
        actions={
          <Link to="/rapport" className="btn">
            Bestyrelsesrapport
          </Link>
        }
      />
      <div className="mb-6">
        <DemoNotice>
          {data.organization.name} er en opdigtet virksomhed. Alle personer, roller og tal er fiktive og beregnet fra demonstrationens grunddata.
        </DemoNotice>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <OrsHero />
        </div>
        <div className="lg:col-span-7">
          <Contributions ors={ors} />
        </div>
      </div>

      <TopRisks />

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel
            eyebrow="Udvikling over tid"
            title="ORS de seneste 13 måneder"
            className="h-full"
            actions={<CoverageText coverage={ors.coverage} />}
          >
            <HistoryChart history={history} label="Organizational Resilience Score pr. måned" selectedDate={asOf} />
          </Panel>
        </div>
        <div className="lg:col-span-5">
          <ExposedGoals />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <KeyPerson />
        </div>
        <div className="lg:col-span-7">
          <Decisions />
        </div>
      </div>
    </div>
  );
}
