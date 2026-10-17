/**
 * Scenariesimulering.
 *
 * Et scenarie er en liste af ændringer, der anvendes på en KOPI af
 * datagrundlaget på analysedatoen. Grunddata ændres aldrig. Resultatet
 * beregnes med præcis samme model som resten af platformen.
 *
 * Afgang simuleres alene som en eksplicit antagelse valgt af brugeren –
 * modellen udleder aldrig sandsynlighed for afgang af personlige forhold.
 */
import type { Dataset, Id, ISODate, ScenarioChange } from '../domain/types';
import { CURRENT_MODEL, type DimensionId, NORMALIZATION, SCENARIO, type ModelConfig } from './config';
import { capacityAt, createCtx, personName, practiceCarriersAt, roleHolder, rolesHeldBy, roleTitle } from './context';
import { computeFindings, findingInScope, type Finding } from './dependencies';
import { computeOrs, createAnalysis, type Analysis, type OrsResult } from './ors';
import { computeRisks, riskInScope, type Risk } from './risk';
import { matchSuccessors } from './succession';
import { addDays } from './time';
import { fmtNumber } from '../lib/format';

export interface UncoveredNeed {
  kind: 'ubesat rolle' | 'tabt viden' | 'kapacitetsgab' | 'praksis uden bærer';
  label: string;
  detail: string;
  rebuildMonths: number | null;
}

export interface ScenarioResult {
  before: OrsResult;
  after: OrsResult;
  dimensionDeltas: { id: DimensionId; before: number | null; after: number | null; delta: number | null }[];
  newFindings: Finding[];
  /** Afhængigheder, der forsvinder, fordi de er løst. */
  resolvedFindings: Finding[];
  /** Afhængigheder, der forsvinder, fordi de er indtruffet (personen er væk). */
  realizedFindings: Finding[];
  /** Samme afhængighed, men med ændret indhold (fx ingen holdere tilbage). */
  changedFindings: Finding[];
  uncovered: UncoveredNeed[];
  /** Estimeret genetableringstid i måneder (længste enkeltbehov) eller null. */
  rebuildMonths: number | null;
  assumptions: string[];
  newRisks: Risk[];
  resolvedRisks: Risk[];
  changedRisks: { risk: Risk; before: number }[];
  afterAnalysis: Analysis;
}

function clone<T>(x: T): T {
  return structuredClone(x);
}

/** Anvender scenarieændringer på en kopi af data. */
export function applyChanges(data: Dataset, changes: ScenarioChange[], asOf: ISODate): { data: Dataset; assumptions: string[] } {
  const d = clone(data);
  const yesterday = addDays(asOf, -1);
  const assumptions: string[] = [];
  let seq = 0;

  for (const ch of changes) {
    const ctx = createCtx(d, asOf);
    switch (ch.type) {
      case 'personUnavailable': {
        const p = d.persons.find((x) => x.id === ch.personId);
        if (!p) break;
        const held = rolesHeldBy(ctx, p.id);
        assumptions.push(`${p.name} er utilgængelig fra ${asOf.split('-').reverse().join('.')}: rolle, viden, kandidatur og praksis bortfalder.`);
        // Kapacitetsantagelse: personen bidrager med ét årsværk til én kapabilitet.
        const capRole = held.find((r) => r.kind !== 'direktion' && r.capabilityIds.length > 0);
        const capKnowledge = d.knowledge.find((k) => k.holders.some((h) => h.personId === p.id && h.level !== 'under oplæring' && (h.to === null || h.to >= asOf) && h.from <= asOf));
        const capId = capRole?.capabilityIds[0] ?? capKnowledge?.capabilityIds[0] ?? null;
        const capability = capId ? d.capabilities.find((c) => c.id === capId) : undefined;
        if (capability) {
          const cur = capacityAt(capability, asOf, NORMALIZATION.capacityMaxAgeMonths);
          if (cur) {
            capability.capacity.push({ date: asOf, value: { required: cur.required, current: Math.max(0, cur.current - 1) } });
            assumptions.push(`Kapaciteten i ${capability.name} reduceres med 1 årsværk.`);
          }
        }
        const readyNow = ch.promoteReadySuccessor ? matchSuccessors(ctx, 'nu') : new Map<Id, Id>();
        p.employedTo = yesterday;
        for (const a of d.assignments) if (a.personId === p.id && (a.end === null || a.end >= asOf)) a.end = yesterday;
        for (const k of d.knowledge) for (const h of k.holders) if (h.personId === p.id && (h.to === null || h.to >= asOf)) h.to = yesterday;
        for (const pr of d.practices) for (const c of pr.carriers) if (c.personId === p.id && (c.to === null || c.to >= asOf)) c.to = yesterday;
        for (const sp of d.successionPlans) for (const c of sp.candidates) if (c.personId === p.id && (c.to === null || c.to >= asOf)) c.to = yesterday;
        if (ch.promoteReadySuccessor) {
          for (const role of held) {
            const successor = readyNow.get(role.id);
            if (!successor) {
              assumptions.push(`${role.title}: ingen efterfølger klar nu – rollen står ubesat.`);
              continue;
            }
            // Efterfølgeren forlader sin nuværende rolle (kaskade).
            for (const a of d.assignments) if (a.personId === successor && (a.end === null || a.end >= asOf)) a.end = yesterday;
            seq += 1;
            d.assignments.push({ id: `S${seq}`, roleId: role.id, personId: successor, start: asOf, end: null, source: 'intern', onboarding: null });
            const succ = d.persons.find((x) => x.id === successor);
            assumptions.push(`${succ?.name ?? successor} overtager ${role.title}; personens hidtidige rolle bliver ledig. Oprykningen registreres som intern besættelse uden registreret onboarding.`);
          }
        } else if (held.length) {
          assumptions.push(`Ingen intern oprykning: ${held.map((r) => r.title).join(', ')} står ubesat.`);
        }
        break;
      }
      case 'successorReady': {
        const plan = d.successionPlans.find((s) => s.roleId === ch.roleId);
        const c = plan?.candidates.find((x) => x.personId === ch.personId);
        if (!plan || !c) break;
        c.assessments.push({ date: asOf, readiness: ch.readiness, basis: 'dokumenteret', assessorRoleId: plan.ownerRoleId, evidenceIds: [] });
        if (c.to !== null && c.to < asOf) c.to = null;
        assumptions.push(`${personName(ctx, ch.personId)} vurderes ${ch.readiness === 'nu' ? 'klar nu' : ch.readiness === '1-2' ? 'klar inden for 1–2 år' : 'klar inden for 3–5 år'} til ${roleTitle(ctx, ch.roleId)} på dokumenteret grundlag.`);
        break;
      }
      case 'knowledgeTransfer': {
        const k = d.knowledge.find((x) => x.id === ch.knowledgeId);
        if (!k) break;
        k.documentation.push({ date: asOf, value: ch.documentationLevel });
        let txt = `${k.name}: dokumentation løftes til niveau ${ch.documentationLevel} af 3`;
        if (ch.addHolderId) {
          for (const h of k.holders) if (h.personId === ch.addHolderId && (h.to === null || h.to >= asOf)) h.to = yesterday;
          k.holders.push({ personId: ch.addHolderId, level: 'praktiker', from: asOf, to: null });
          txt += `, og ${personName(ctx, ch.addHolderId)} bliver kvalificeret praktiker`;
        }
        assumptions.push(`${txt}.`);
        break;
      }
      case 'capabilityCapacity': {
        const c = d.capabilities.find((x) => x.id === ch.capabilityId);
        if (!c) break;
        const cur = capacityAt(c, asOf, NORMALIZATION.capacityMaxAgeMonths);
        if (!cur) {
          assumptions.push(`${c.name}: ingen aktuel kapacitetsopgørelse – ændringen kan ikke anvendes.`);
          break;
        }
        c.capacity.push({ date: asOf, value: { required: Math.max(0, cur.required + ch.requiredDeltaFte), current: Math.max(0, cur.current + ch.currentDeltaFte) } });
        const parts: string[] = [];
        if (ch.requiredDeltaFte) parts.push(`behovet ${ch.requiredDeltaFte > 0 ? 'øges' : 'reduceres'} med ${fmtNumber(Math.abs(ch.requiredDeltaFte), 1)} årsværk`);
        if (ch.currentDeltaFte) parts.push(`kapaciteten ${ch.currentDeltaFte > 0 ? 'øges' : 'reduceres'} med ${fmtNumber(Math.abs(ch.currentDeltaFte), 1)} årsværk`);
        assumptions.push(`${c.name}: ${parts.join(', ') || 'ingen ændring'}.`);
        break;
      }
      case 'practiceAnchoring': {
        const p = d.practices.find((x) => x.id === ch.practiceId);
        if (!p) break;
        if (ch.formalize) {
          p.documented.push({ date: asOf, value: true });
          if (!p.ownerRoleId) p.ownerRoleId = d.roles.find((r) => p.unitIds.includes(r.unitId) && r.leadership)?.id ?? null;
        }
        for (const pid of ch.addCarrierIds) {
          if (!p.carriers.some((c) => c.personId === pid && (c.to === null || c.to >= asOf))) p.carriers.push({ personId: pid, from: asOf, to: null });
        }
        assumptions.push(`${p.name}: ${ch.formalize ? 'formel ejer og beskrivelse' : ''}${ch.formalize && ch.addCarrierIds.length ? ' samt ' : ''}${ch.addCarrierIds.length ? `${ch.addCarrierIds.map((x) => personName(ctx, x)).join(', ')} som ekstra bærer` : ''}.`);
        break;
      }
    }
  }
  return { data: d, assumptions };
}

function uncoveredNeeds(a: Analysis, base: Analysis, scope: Id | null): UncoveredNeed[] {
  const { ctx } = a;
  const out: UncoveredNeed[] = [];
  const inScope = (unitId: Id) => scope === null || unitId === scope;
  for (const r of ctx.data.roles) {
    if (!inScope(r.unitId)) continue;
    const wasFilled = !!roleHolder(base.ctx, r.id);
    if (wasFilled && !roleHolder(ctx, r.id)) {
      const s = a.succession.roles.get(r.id);
      const months = s?.effectiveNow ? SCENARIO.readySuccessorMonths : r.recruitMonths + r.rampUpMonths;
      out.push({
        kind: 'ubesat rolle',
        label: r.title,
        detail: s?.effectiveNow ? `${personName(ctx, s.effectiveNow)} kan overtage (klar nu)` : `Ekstern rekruttering ${r.recruitMonths} mdr. + indkøring ${r.rampUpMonths} mdr.`,
        rebuildMonths: months,
      });
    }
  }
  for (const kv of a.knowledge.values()) {
    if (!inScope(kv.area.unitId)) continue;
    const before = base.knowledge.get(kv.id);
    if (before && before.qualified.length > 0 && kv.qualified.length === 0) {
      out.push({ kind: 'tabt viden', label: kv.area.name, detail: 'Ingen kvalificerede holdere tilbage', rebuildMonths: kv.rebuildMonths });
    }
  }
  for (const c of ctx.data.capabilities) {
    if (!inScope(c.unitId)) continue;
    const now = capacityAt(c, ctx.asOf, NORMALIZATION.capacityMaxAgeMonths);
    const prev = capacityAt(c, base.ctx.asOf, NORMALIZATION.capacityMaxAgeMonths);
    if (!now || !prev || now.required <= 0) continue;
    const covNow = now.current / now.required;
    const covPrev = prev.current / prev.required;
    if (covNow < 0.8 && covNow < covPrev - 0.001) {
      out.push({
        kind: 'kapacitetsgab',
        label: c.name,
        detail: `Dækning ${fmtNumber(covPrev * 100, 0)} % → ${fmtNumber(covNow * 100, 0)} %`,
        rebuildMonths: null,
      });
    }
  }
  for (const p of ctx.data.practices) {
    if (scope !== null && !p.unitIds.includes(scope)) continue;
    const basePractice = base.ctx.data.practices.find((x) => x.id === p.id);
    const had = basePractice ? practiceCarriersAt(base.ctx, basePractice).length > 0 : false;
    if (p.registered <= ctx.asOf && had && practiceCarriersAt(ctx, p).length === 0) {
      out.push({ kind: 'praksis uden bærer', label: p.name, detail: 'Praksis har ingen aktive bærere', rebuildMonths: null });
    }
  }
  return out;
}

export function runScenario(
  data: Dataset,
  changes: ScenarioChange[],
  asOf: ISODate,
  scope: Id | null,
  model: ModelConfig = CURRENT_MODEL,
): ScenarioResult {
  const base = createAnalysis(data, asOf);
  const applied = applyChanges(data, changes, asOf);
  const after = createAnalysis(applied.data, asOf);
  const orsBefore = computeOrs(base, scope, model);
  const orsAfter = computeOrs(after, scope, model);

  const fBefore = computeFindings(base).filter((f) => findingInScope(f, scope));
  const fAfter = computeFindings(after).filter((f) => findingInScope(f, scope));
  const keysBefore = new Set(fBefore.map((f) => f.key));
  const keysAfter = new Set(fAfter.map((f) => f.key));

  const rBefore = computeRisks(base).filter((r) => riskInScope(r, scope));
  const rAfter = computeRisks(after).filter((r) => riskInScope(r, scope));
  const beforeById = new Map(rBefore.map((r) => [r.id, r]));
  const afterIds = new Set(rAfter.map((r) => r.id));

  const uncovered = uncoveredNeeds(after, base, scope);
  const unavailable = new Set(changes.flatMap((c) => (c.type === 'personUnavailable' ? [c.personId] : [])));
  const months = uncovered.map((u) => u.rebuildMonths).filter((m): m is number => m !== null);

  return {
    before: orsBefore,
    after: orsAfter,
    dimensionDeltas: orsBefore.dimensions.map((d, i) => {
      const a = orsAfter.dimensions[i]!;
      return { id: d.id, before: d.score, after: a.score, delta: d.score !== null && a.score !== null ? a.score - d.score : null };
    }),
    newFindings: fAfter.filter((f) => !keysBefore.has(f.key)),
    resolvedFindings: fBefore.filter((f) => !keysAfter.has(f.key) && !f.personIds.some((p) => unavailable.has(p))),
    realizedFindings: fBefore.filter((f) => !keysAfter.has(f.key) && f.personIds.some((p) => unavailable.has(p))),
    changedFindings: fAfter.filter((f) => keysBefore.has(f.key) && fBefore.find((b) => b.key === f.key)!.detail !== f.detail),
    uncovered,
    rebuildMonths: months.length ? Math.max(...months) : null,
    assumptions: applied.assumptions,
    newRisks: rAfter.filter((r) => !beforeById.has(r.id)),
    resolvedRisks: rBefore.filter((r) => !afterIds.has(r.id)),
    changedRisks: rAfter
      .filter((r) => beforeById.has(r.id) && beforeById.get(r.id)!.priority !== r.priority)
      .map((r) => ({ risk: r, before: beforeById.get(r.id)!.priority })),
    afterAnalysis: after,
  };
}
