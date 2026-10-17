import type { Id } from '../../domain/types';
import { RISK_MODEL } from '../../model/config';
import { CATEGORY_LABEL, type Risk } from '../../model/risk';
import { fmtDate, fmtMonth } from '../../lib/format';
import { useRouter } from '../../lib/router';
import { useApp, useLookup } from '../../state/AppState';
import { useActionEffects } from '../../state/derived';
import { Delta } from '../../ui/Figures';
import { DefList, SectionTitle } from '../../ui/Layout';
import { BandBadge, RiskStatusText } from '../../ui/Status';
import { BasisMark, DetailLink, GoalChips } from '../common';

function FactorBlock({ code, name, value, scaleNote, lines }: { code: string; name: string; value: number; scaleNote: string; lines: string[] }) {
  return (
    <div className="rounded-md border border-rule bg-paper/50 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">
          <span className="font-mono text-ink-muted">{code}</span> {name}
        </p>
        <p className="num font-serif text-xl font-semibold">
          {value}
          <span className="text-sm text-ink-muted"> / 5</span>
        </p>
      </div>
      <p className="text-2xs text-ink-muted">{scaleNote}</p>
      <ul className="mt-2 list-disc space-y-0.5 pl-4 text-2xs text-ink-2">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  );
}

export function RiskDetail({ risk }: { risk: Risk }) {
  const { data, allRisks, asOf } = useApp();
  const { roleTitle, goals, unitName, caps, knowledge, roles } = useLookup();
  const effects = useActionEffects();
  const { navigate } = useRouter();
  const K = risk.consequence.value;
  const E = risk.exposure.value;
  const B = risk.readiness.value;
  const actionIds = risk.treatment?.actionIds ?? data.actions.filter((a) => a.riskIds.includes(risk.id)).map((a) => a.id);
  const linked = effects.filter((e) => actionIds.includes(e.action.id));
  const personRoot = risk.rootKey.startsWith('person:') ? risk.rootKey.slice(7) : null;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <BandBadge band={risk.band} />
        <span className="num text-sm">
          Prioritet <strong className="font-semibold">{risk.priority}</strong> af 100
        </span>
        <span className="text-sm text-ink-2">
          Status: <RiskStatusText status={risk.treatment?.status ?? null} />
        </span>
        <span className="font-mono text-2xs text-ink-muted">{risk.id}</span>
      </div>

      <section>
        <SectionTitle>Forretningskonsekvens</SectionTitle>
        <p className="text-[15px] leading-relaxed">{risk.businessConsequence}</p>
        <DefList
          className="mt-4"
          items={[
            ['Kategori', CATEGORY_LABEL[risk.category]],
            ['Enhed', unitName(risk.unitId)],
            [
              'Berørte mål',
              <span key="g" className="flex flex-col gap-1">
                {risk.goalIds.map((g) => (
                  <span key={g}>
                    <span className="font-mono text-2xs text-ink-muted">{goals.get(g)?.code}</span> {goals.get(g)?.title}
                  </span>
                ))}
                {risk.goalIds.length === 0 && <GoalChips goalIds={[]} />}
              </span>,
            ],
            ['Tidshorisont', <span key="h">{risk.horizon.label}{risk.horizon.milestone && <span className="block text-2xs text-ink-muted">Næste milepæl: {risk.horizon.milestone}</span>}</span>],
          ]}
        />
      </section>

      <section>
        <SectionTitle>Sådan er prioriteten beregnet</SectionTitle>
        <p className="num rounded-sm border border-rule bg-surface px-3 py-2 font-mono text-2xs text-ink-2">
          Prioritet = 100 × K × E × (6 − B) ÷ 125 = 100 × {K} × {E} × (6 − {B}) ÷ 125 = <strong className="text-ink">{risk.priority}</strong>
        </p>
        <div className="mt-3 grid gap-3">
          <FactorBlock code="K" name="Konsekvens" value={K} scaleNote="Hvor hårdt rammes strategien, hvis risikoen indtræffer (5 = alvorligst)." lines={risk.consequence.explanation} />
          <FactorBlock code="E" name="Eksponering" value={E} scaleNote="Hvor koncentreret og svært erstattelig er sårbarheden (5 = mest eksponeret)." lines={risk.exposure.explanation} />
          <FactorBlock code="B" name="Beredskab" value={B} scaleNote="Hvilke afværgeforanstaltninger virker allerede (5 = bedst forberedt)." lines={risk.readiness.explanation} />
        </div>
        <div className="mt-3 rounded-md border border-dashed border-rule-strong p-3 text-2xs text-ink-2">
          <p className="font-semibold text-ink">Vurderet sandsynlighed</p>
          {risk.probability ? (
            <p className="mt-1">
              {risk.probability.value} af 5 – vurderet af {roleTitle(risk.probability.assessorRoleId)} {fmtDate(risk.probability.date)} (menneskelig vurdering): {risk.probability.rationale}
            </p>
          ) : (
            <p className="mt-1">Ikke vurderet.</p>
          )}
          <p className="mt-1 text-ink-muted">Sandsynligheden vises separat og indgår ikke i prioriteten. Modellen estimerer aldrig sandsynlighed for, at en bestemt person forlader virksomheden.</p>
        </div>
      </section>

      <section>
        <SectionTitle>Berørte roller, kapabiliteter og viden</SectionTitle>
        <ul className="space-y-1 text-sm">
          {risk.roleIds.map((id) => (
            <li key={id}>
              <span className="text-2xs text-ink-muted">Rolle · </span>
              <DetailLink type="rolle" id={id}>{roles.get(id)?.title ?? id}</DetailLink>
            </li>
          ))}
          {risk.capabilityIds.map((id) => (
            <li key={id}>
              <span className="text-2xs text-ink-muted">Kapabilitet · </span>
              <DetailLink type="kapabilitet" id={id}>{caps.get(id)?.name ?? id}</DetailLink>
            </li>
          ))}
          {risk.knowledgeIds.map((id) => (
            <li key={id}>
              <span className="text-2xs text-ink-muted">Viden · </span>
              <DetailLink type="viden" id={id}>{knowledge.get(id)?.name ?? id}</DetailLink>
            </li>
          ))}
          {risk.subject.type === 'praksis' && (
            <li>
              <span className="text-2xs text-ink-muted">Praksis · </span>
              <DetailLink type="praksis" id={risk.subject.id}>{data.practices.find((p) => p.id === risk.subject.id)?.name}</DetailLink>
            </li>
          )}
        </ul>
      </section>

      <section>
        <SectionTitle>Evidens og datakvalitet</SectionTitle>
        <ul className="divide-y divide-rule rounded-md border border-rule">
          {risk.evidence.map((e, i) => (
            <li key={i} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="text-sm">{e.label}</span>
              <span className="flex shrink-0 flex-col items-start text-2xs text-ink-muted sm:items-end">
                <span>
                  {e.source}
                  {e.date ? ` · ${fmtDate(e.date)}` : ''}
                </span>
                <BasisMark basis={e.basis} />
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          Datakvalitet: <strong className="font-semibold">{risk.dataQuality.level === 'høj' ? 'Høj' : risk.dataQuality.level === 'middel' ? 'Middel' : 'Lav'}</strong>
        </p>
        {risk.dataQuality.notes.length > 0 && (
          <ul className="mt-1 list-disc pl-4 text-2xs text-ink-2">
            {risk.dataQuality.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle>Eksisterende afværgeforanstaltninger</SectionTitle>
        {risk.treatment && risk.treatment.mitigations.length > 0 ? (
          <ul className="list-disc space-y-0.5 pl-4 text-sm">
            {risk.treatment.mitigations.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">Ingen registrerede afværgeforanstaltninger.</p>
        )}
        <DefList
          className="mt-3"
          items={[
            ['Ansvarlig rolle', risk.treatment ? roleTitle(risk.treatment.ownerRoleId) : `${roleTitle(risk.suggestedOwnerRoleId)} (foreslået – ikke udpeget)`],
            ['Opfølgning', risk.treatment ? fmtDate(risk.treatment.followUp) : 'Ikke planlagt'],
          ]}
        />
      </section>

      <section>
        <SectionTitle>Anbefalet handling</SectionTitle>
        {linked.length > 0 ? (
          <ul className="space-y-2">
            {linked.map((e) => (
              <li key={e.action.id} className="rounded-md border border-rule p-3">
                <DetailLink type="handling" id={e.action.id} className="font-medium">
                  {e.action.title}
                </DetailLink>
                <p className="mt-1 text-2xs text-ink-muted">
                  {roleTitle(e.action.ownerRoleId)} · frist {fmtDate(e.action.due)} · {e.action.status}
                </p>
                <p className="mt-1 text-2xs">
                  Forventet effekt: {e.orsDelta === null ? <span className="text-ink-muted">{e.action.effectNote ?? 'ikke modelleret'}</span> : <Delta value={e.orsDelta} suffix="ORS" />}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">
            {risk.recommendation} <span className="text-ink-muted">Foreslået ansvarlig: {roleTitle(risk.suggestedOwnerRoleId)}.</span>
          </p>
        )}
        {personRoot && (
          <button
            type="button"
            className="btn mt-3"
            onClick={() => navigate('/scenarier', { s: 'nøgleperson', p: personRoot, prom: '1' })}
          >
            Simulér, at personen bag risikoen bliver utilgængelig
          </button>
        )}
      </section>

      {risk.relatedRiskIds.length > 0 && (
        <section>
          <SectionTitle>Relaterede risici (samme rod)</SectionTitle>
          <p className="mb-2 text-2xs text-ink-muted">Disse risici udspringer af samme person eller kapabilitet og tælles kun én gang i overblikket.</p>
          <ul className="space-y-1 text-sm">
            {risk.relatedRiskIds.map((id: Id) => {
              const r = allRisks.find((x) => x.id === id);
              return r ? (
                <li key={id} className="flex items-center gap-2">
                  <BandBadge band={r.band} priority={r.priority} />
                  <DetailLink type="risiko" id={id}>{r.title}</DetailLink>
                </li>
              ) : null;
            })}
          </ul>
        </section>
      )}
      <p className="text-2xs text-ink-muted">
        Beregnet for {fmtMonth(asOf)} med risikomodel v{RISK_MODEL.version}.
      </p>
    </div>
  );
}
