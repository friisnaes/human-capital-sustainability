import type { Action, Capability, CulturePractice, KnowledgeArea } from '../../domain/types';
import { DIMENSIONS } from '../../model/catalog';
import { NORMALIZATION } from '../../model/config';
import { capacityAt, futureImportanceAssessment, roleHolder } from '../../model/context';
import { practiceAnchoring } from '../../model/indicators';
import { capabilityPoints, QUADRANT_LABEL, QUADRANT_TEXT } from '../../model/matrix';
import { valueAt } from '../../model/time';
import { fmtDate, fmtMonths, fmtNumber, fmtPct, fmtScore } from '../../lib/format';
import { useApp, useLookup } from '../../state/AppState';
import { useActionEffects } from '../../state/derived';
import { Delta } from '../../ui/Figures';
import { DefList, SectionTitle } from '../../ui/Layout';
import { BandBadge } from '../../ui/Status';
import { BasisMark, DetailLink } from '../common';

function RiskList({ ids }: { ids: string[] }) {
  const { allRisks } = useApp();
  const risks = allRisks.filter((r) => ids.includes(r.id));
  if (!risks.length) return <p className="text-sm text-ink-muted">Ingen beregnede risici.</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {risks.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-2">
          <BandBadge band={r.band} priority={r.priority} />
          <DetailLink type="risiko" id={r.id}>{r.title}</DetailLink>
        </li>
      ))}
    </ul>
  );
}

export function CapabilityDetail({ cap }: { cap: Capability }) {
  const { analysis, asOf, allRisks, data } = useApp();
  const { unitName, roleTitle, goals, personName, knowledge } = useLookup();
  const fi = futureImportanceAssessment(analysis.ctx, cap.id);
  const cp = capacityAt(cap, asOf, NORMALIZATION.capacityMaxAgeMonths);
  const point = capabilityPoints(analysis, null).find((p) => p.id === cap.id);
  const roles = data.roles.filter((r) => r.capabilityIds.includes(cap.id));
  const ks = data.knowledge.filter((k) => k.capabilityIds.includes(cap.id));
  const risks = allRisks.filter((r) => r.capabilityIds.includes(cap.id)).map((r) => r.id);
  const history = cap.capacity.filter((p) => p.date <= asOf);
  return (
    <div className="space-y-7">
      <p className="text-[15px] leading-relaxed">{cap.description}</p>
      <DefList
        items={[
          ['Enhed', unitName(cap.unitId)],
          [
            'Fremtidig betydning',
            fi ? (
              <span key="fi">
                {fi.value} af 5 <span className="text-2xs text-ink-muted">· {roleTitle(fi.assessorRoleId)}, {fmtDate(fi.date)}</span>
                <span className="block text-2xs text-ink-2">{fi.rationale}</span>
                <BasisMark basis={fi.basis} />
              </span>
            ) : (
              'Ikke vurderet'
            ),
          ],
          ['Kapacitet', cp ? `${fmtNumber(cp.current, 1)} af ${fmtNumber(cp.required, 1)} årsværk (${fmtPct(Math.min(1, cp.current / cp.required))} dækning)` : 'Ingen aktuel opgørelse'],
          ['Kilde', cap.capacitySource],
          [
            'Strategiske mål',
            <span key="g" className="flex flex-col">
              {cap.goalIds.map((g) => (
                <span key={g}>
                  <span className="font-mono text-2xs text-ink-muted">{goals.get(g)?.code}</span> {goals.get(g)?.title}
                </span>
              ))}
            </span>,
          ],
        ]}
      />
      {point && (
        <section>
          <SectionTitle>Future Value Matrix™</SectionTitle>
          <p className="text-sm">
            Beredskab <strong className="num">{fmtScore(point.y)}</strong> · placering: <strong>{point.quadrant ? QUADRANT_LABEL[point.quadrant] : 'Ikke placeret'}</strong>
          </p>
          {point.quadrant && <p className="mt-1 text-2xs text-ink-2">{QUADRANT_TEXT[point.quadrant]}</p>}
          <ul className="mt-2 grid grid-cols-3 gap-2 text-2xs">
            {(['kapacitet', 'viden', 'succession'] as const).map((k) => (
              <li key={k} className="rounded-sm border border-rule p-2">
                <span className="block text-ink-muted">{k === 'kapacitet' ? 'Kapacitet' : k === 'viden' ? 'Viden (svageste)' : 'Succession'}</span>
                <span className="num text-sm font-semibold">{point.components[k] === null || point.components[k] === undefined ? '—' : fmtScore(point.components[k]!)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <SectionTitle>Kapacitetsforløb</SectionTitle>
        <table className="w-full text-2xs">
          <caption className="sr-only">Kapacitet over tid</caption>
          <thead>
            <tr>
              <th className="th">Opgjort</th>
              <th className="th text-right">Faktisk</th>
              <th className="th text-right">Krævet</th>
              <th className="th text-right">Dækning</th>
            </tr>
          </thead>
          <tbody>
            {history.map((p) => (
              <tr key={p.date}>
                <td className="td !py-1.5">{fmtDate(p.date)}</td>
                <td className="td num !py-1.5 text-right">{fmtNumber(p.value.current, 1)}</td>
                <td className="td num !py-1.5 text-right">{fmtNumber(p.value.required, 1)}</td>
                <td className="td num !py-1.5 text-right">{fmtPct(Math.min(1, p.value.current / p.value.required))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <SectionTitle>Roller og viden</SectionTitle>
        <ul className="space-y-1 text-sm">
          {roles.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2">
              <DetailLink type="rolle" id={r.id}>{r.title}</DetailLink>
              <span className="text-2xs text-ink-muted">{roleHolder(analysis.ctx, r.id) ? personName(roleHolder(analysis.ctx, r.id)!.id) : 'Ubesat'}</span>
            </li>
          ))}
          {ks.map((k) => (
            <li key={k.id}>
              <span className="text-2xs text-ink-muted">Viden · </span>
              <DetailLink type="viden" id={k.id}>{knowledge.get(k.id)?.name}</DetailLink>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <SectionTitle>Risici</SectionTitle>
        <RiskList ids={risks} />
      </section>
    </div>
  );
}

export function KnowledgeDetail({ area }: { area: KnowledgeArea }) {
  const { analysis, allRisks, data } = useApp();
  const { personName, unitName, caps } = useLookup();
  const kv = analysis.knowledge.get(area.id)!;
  const ev = data.evidence.filter((e) => e.knowledgeId === area.id && e.date <= analysis.ctx.asOf);
  const risks = allRisks.filter((r) => r.knowledgeIds.includes(area.id)).map((r) => r.id);
  return (
    <div className="space-y-7">
      <p className="text-[15px] leading-relaxed">{area.description}</p>
      <DefList
        items={[
          ['Enhed', unitName(area.unitId)],
          ['Kritikalitet', `${area.criticality} af 5`],
          ['Dokumentation', kv.docLevel === null ? 'Ikke vurderet' : `Niveau ${kv.docLevel} af 3 (vurderet ${fmtDate(kv.docAssessed)})`],
          ['Genetableringstid', `${fmtMonths(kv.rebuildMonths)} ved tab af primær holder`],
          ['Basistid uden dokumentation', `${area.baseRebuildMonths} mdr.`],
          [
            'Kapabiliteter',
            <span key="c" className="flex flex-col">
              {area.capabilityIds.map((c) => (
                <DetailLink key={c} type="kapabilitet" id={c}>{caps.get(c)?.name}</DetailLink>
              ))}
            </span>,
          ],
        ]}
      />
      <section>
        <SectionTitle>Vidensholdere</SectionTitle>
        <ul className="space-y-1 text-sm">
          {[...kv.qualified, ...kv.trainees].map((h) => (
            <li key={`${h.personId}-${h.from}`} className="flex justify-between gap-2">
              <span>{personName(h.personId)}</span>
              <span className="text-2xs text-ink-muted">
                {h.level} siden {fmtDate(h.from)}
              </span>
            </li>
          ))}
          {kv.qualified.length + kv.trainees.length === 0 && <li className="text-risk">Ingen aktive holdere</li>}
        </ul>
        <p className="mt-2 text-2xs text-ink-muted">Kun eksperter og praktikere tæller som kvalificerede holdere. Personer under oplæring indgår i beredskabet, ikke i backup-dækningen.</p>
      </section>
      {ev.length > 0 && (
        <section>
          <SectionTitle>Dokumenteret evidens</SectionTitle>
          <ul className="space-y-1 text-2xs text-ink-2">
            {ev.map((e) => (
              <li key={e.id}>
                <span className="text-ink">{e.title}</span> · {fmtDate(e.date)} · kilde: {e.source}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <SectionTitle>Risici</SectionTitle>
        <RiskList ids={risks} />
      </section>
    </div>
  );
}

const CATEGORY_TEXT: Record<CulturePractice['category'], string> = {
  videndeling: 'Videndeling',
  onboarding: 'Onboarding',
  'tværgående samarbejde': 'Tværgående samarbejde',
  beslutningsrutine: 'Beslutningsrutine',
  læringsrutine: 'Læringsrutine',
  arbejdspraksis: 'Kritisk arbejdspraksis',
};

export function PracticeDetail({ practice }: { practice: CulturePractice }) {
  const { analysis, allRisks, unitId } = useApp();
  const { personName, roleTitle, unitName } = useLookup();
  const a = practiceAnchoring({ ctx: analysis.ctx, scope: unitId, succession: analysis.succession, knowledge: analysis.knowledge }, practice.id);
  const doc = valueAt(practice.documented, analysis.ctx.asOf)?.value ?? false;
  const risks = allRisks.filter((r) => r.subject.type === 'praksis' && r.subject.id === practice.id).map((r) => r.id);
  return (
    <div className="space-y-7">
      <p className="text-[15px] leading-relaxed">{practice.description}</p>
      <DefList
        items={[
          ['Kategori', CATEGORY_TEXT[practice.category]],
          ['Enheder', practice.unitIds.map((u) => unitName(u)).join(', ')],
          ['Betydning', `${practice.importance} af 5`],
          ['Forankring', a.state === 'forankret' ? 'Forankret' : a.state === 'delvis' ? 'Delvist forankret' : 'Personbåret'],
          ['Formel ejer', practice.ownerRoleId ? roleTitle(practice.ownerRoleId) : 'Ingen'],
          ['Beskrevet', doc ? 'Ja' : 'Nej'],
          ['Registreret', fmtDate(practice.registered)],
        ]}
      />
      <section>
        <SectionTitle>Bærere</SectionTitle>
        <ul className="space-y-1 text-sm">
          {practice.carriers
            .filter((c) => c.from <= analysis.ctx.asOf && (c.to === null || c.to >= analysis.ctx.asOf))
            .map((c) => (
              <li key={c.personId}>{personName(c.personId)}</li>
            ))}
        </ul>
      </section>
      <section>
        <SectionTitle>Gennemførelse pr. kvartal</SectionTitle>
        <ul className="space-y-1 text-sm">
          {practice.adherence
            .filter((p) => p.date <= analysis.ctx.asOf)
            .map((p) => (
              <li key={p.date} className="flex justify-between">
                <span>{fmtDate(p.date)}</span>
                <span className="num">{fmtPct(p.value)}</span>
              </li>
            ))}
        </ul>
        <p className="mt-2 text-2xs text-ink-muted">Opgjort fra mødekalendere på aggregeret niveau. Indhold af møder og beskeder analyseres ikke.</p>
      </section>
      <section>
        <SectionTitle>Risici</SectionTitle>
        <RiskList ids={risks} />
      </section>
    </div>
  );
}

export function ActionDetail({ action }: { action: Action }) {
  const effects = useActionEffects();
  const { roleTitle } = useLookup();
  const e = effects.find((x) => x.action.id === action.id);
  const r = e?.result ?? null;
  if (!e) {
    return <p className="text-sm text-ink-2">Handlingen er besluttet {fmtDate(action.registered)} og findes ikke i den valgte periode eller enhed. Vælg en senere periode eller hele organisationen for at se den.</p>;
  }
  return (
    <div className="space-y-7">
      <p className="text-[15px] leading-relaxed">{action.description}</p>
      <DefList
        items={[
          ['Ansvarlig rolle', roleTitle(action.ownerRoleId)],
          ['Start', fmtDate(action.start)],
          ['Frist', fmtDate(action.due)],
          ['Besluttet', fmtDate(action.registered)],
          ['Status', <span key="s" className={e.action.status === 'forsinket' ? 'font-semibold text-risk' : ''}>{e.action.status}</span>],
          ['Beslutning', e.decision],
        ]}
      />
      <section>
        <SectionTitle>Adresserer</SectionTitle>
        <RiskList ids={action.riskIds} />
      </section>
      <section>
        <SectionTitle>Forventet effekt (beregnet)</SectionTitle>
        {!r ? (
          <p className="text-sm text-ink-2">{action.effectNote}</p>
        ) : (
          <>
            <p className="text-sm">
              ORS {fmtScore(r.before.score)} → {fmtScore(r.after.score)} <Delta value={e.orsDelta} />
            </p>
            <ul className="mt-2 space-y-0.5 text-2xs text-ink-2">
              {r.dimensionDeltas
                .filter((d) => d.delta !== null && Math.abs(d.delta) >= 0.5)
                .map((d) => (
                  <li key={d.id}>
                    {DIMENSIONS[d.id].name}: {fmtScore(d.before)} → {fmtScore(d.after)}
                  </li>
                ))}
            </ul>
            {r.resolvedRisks.length > 0 && <p className="mt-2 text-2xs text-teal">Fjerner {r.resolvedRisks.length} beregnede {r.resolvedRisks.length === 1 ? 'risiko' : 'risici'}: {r.resolvedRisks.map((x) => x.title).join('; ')}.</p>}
            {r.changedRisks.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-2xs text-ink-2">
                {r.changedRisks.map((c) => (
                  <li key={c.risk.id}>
                    {c.risk.title}: prioritet {c.before} → {c.risk.priority}
                  </li>
                ))}
              </ul>
            )}
            <SectionTitle>Antagelser</SectionTitle>
            <ul className="list-disc space-y-0.5 pl-4 text-2xs text-ink-2">
              {r.assumptions.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
            <p className="mt-2 text-2xs text-ink-muted">Effekten forudsætter, at handlingen gennemføres som beskrevet. Den er beregnet på en kopi af data – grunddata er uændrede.</p>
          </>
        )}
      </section>
    </div>
  );
}
