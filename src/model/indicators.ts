/**
 * Indikatorer for Organizational Resilience Score™.
 *
 * Hver indikator returnerer en værdi 0–100 (eller null), sin datadækning og
 * de enkelte observationer, så resultatet kan efterregnes i brugerfladen.
 * Manglende data bliver aldrig til nul: observationer uden data udelades af
 * gennemsnittet og trækker i stedet datadækningen ned.
 */
import type { Id, ISODate, Readiness } from '../domain/types';
import { CRITICALITY, type IndicatorId, MIN_N, NORMALIZATION, WINDOWS } from './config';
import {
  activeAssignment,
  activeCandidates,
  capacityAt,
  type Ctx,
  futureImportance,
  inScope,
  isFilled,
  personName,
  planAt,
  practiceCarriersAt,
  practiceOwnerFilled,
  readinessAt,
  roleHolder,
} from './context';
import type { KnowledgeView } from './knowledge';
import { READINESS_ORDER, type SuccessionAnalysis } from './succession';
import { addDays, addMonths, overlaps, valueAt } from './time';
import { fmtNumber, fmtPct } from '../lib/format';

export type RefType = 'rolle' | 'kapabilitet' | 'viden' | 'praksis' | 'milepæl' | 'person' | 'besættelse';

export interface IndicatorItem {
  key: string;
  label: string;
  ref: { type: RefType; id: Id } | null;
  weight: number;
  value: number | null;
  detail: string;
}

export interface IndicatorResult {
  id: IndicatorId;
  value: number | null;
  /** Vægtet andel af observationer med data (0–1). */
  coverage: number;
  /** Indikatoren er relevant i udsnittet (der findes noget at måle). */
  applicable: boolean;
  n: number;
  nWithData: number;
  reason: string | null;
  items: IndicatorItem[];
}

export interface IndicatorInput {
  ctx: Ctx;
  scope: Id | null;
  succession: SuccessionAnalysis;
  knowledge: Map<Id, KnowledgeView>;
}

interface AggregateOptions {
  minN?: number;
  /** Hvis der ingen observationer er: er det manglende data (true) eller blot intet at måle (false)? */
  emptyIsMissing: boolean;
  emptyReason: string;
}

export function aggregate(id: IndicatorId, items: IndicatorItem[], opts: AggregateOptions): IndicatorResult {
  const withData = items.filter((i) => i.value !== null);
  const totalW = items.reduce((s, i) => s + i.weight, 0);
  const dataW = withData.reduce((s, i) => s + i.weight, 0);
  const base = { id, items, n: items.length, nWithData: withData.length };
  if (items.length === 0) {
    return { ...base, value: null, coverage: 0, applicable: opts.emptyIsMissing, reason: opts.emptyReason };
  }
  const minN = opts.minN ?? 1;
  if (withData.length < minN) {
    return {
      ...base,
      value: null,
      coverage: 0,
      applicable: true,
      reason: withData.length === 0 ? 'Ingen observationer med data' : `For få observationer (${withData.length} af mindst ${minN})`,
    };
  }
  const value = withData.reduce((s, i) => s + i.weight * (i.value as number), 0) / dataW;
  return { ...base, value, coverage: totalW > 0 ? dataW / totalW : 0, applicable: true, reason: null };
}

function scopedRoles(inp: IndicatorInput) {
  return inp.ctx.data.roles.filter((r) => inScope(r.unitId, inp.scope));
}

function scopedCapabilities(inp: IndicatorInput) {
  return inp.ctx.data.capabilities.filter((c) => inScope(c.unitId, inp.scope));
}

function evidenceActive(inp: IndicatorInput, personId: Id, types: string[], date: ISODate): boolean {
  const winStart = addMonths(date, -WINDOWS.evidenceMonths);
  return inp.ctx.data.evidence.some(
    (e) => e.personId === personId && types.includes(e.type) && e.date <= date && overlaps(e.date, e.endDate, winStart, date),
  );
}

// ---------------------------------------------------------------- D1

export function i11(inp: IndicatorInput): IndicatorResult {
  const { ctx } = inp;
  const items: IndicatorItem[] = scopedCapabilities(inp)
    .filter((c) => c.goalIds.length > 0)
    .map((c) => {
      const fi = futureImportance(ctx, c.id);
      const cp = capacityAt(c, ctx.asOf, NORMALIZATION.capacityMaxAgeMonths);
      const cov = cp && cp.required > 0 ? Math.min(1, cp.current / cp.required) : null;
      return {
        key: c.id,
        label: c.name,
        ref: { type: 'kapabilitet', id: c.id },
        weight: fi ?? 1,
        value: fi !== null && cov !== null ? cov * 100 : null,
        detail:
          cp && fi !== null
            ? `${fmtNumber(cp.current, 1)} af ${fmtNumber(cp.required, 1)} årsværk (${fmtPct(cov ?? 0)}) · fremtidig betydning ${fi}`
            : 'Mangler aktuel kapacitetsopgørelse eller vurdering af fremtidig betydning',
      };
    });
  return aggregate('I1.1', items, { emptyIsMissing: false, emptyReason: 'Ingen strategiske kapabiliteter i udsnittet' });
}

export function i12(inp: IndicatorInput): IndicatorResult {
  const { ctx } = inp;
  const items: IndicatorItem[] = scopedRoles(inp)
    .filter((r) => r.criticality >= CRITICALITY.criticalRole)
    .map((r) => {
      const holder = roleHolder(ctx, r.id);
      return {
        key: r.id,
        label: r.title,
        ref: { type: 'rolle', id: r.id },
        weight: r.criticality,
        value: holder ? 100 : 0,
        detail: holder ? `Besat af ${holder.name}` : 'Ubesat',
      };
    });
  return aggregate('I1.2', items, { emptyIsMissing: false, emptyReason: 'Ingen kritiske roller i udsnittet' });
}

// ---------------------------------------------------------------- D2

function scopedKnowledge(inp: IndicatorInput): KnowledgeView[] {
  return [...inp.knowledge.values()].filter(
    (k) => inScope(k.area.unitId, inp.scope) && k.area.criticality >= CRITICALITY.knowledgeInScope,
  );
}

export function i21(inp: IndicatorInput): IndicatorResult {
  const items = scopedKnowledge(inp).map((k) => ({
    key: k.id,
    label: k.area.name,
    ref: { type: 'viden' as const, id: k.id },
    weight: k.area.criticality,
    value: k.backupScore,
    detail: `${k.qualified.length} kvalificerede holdere${k.trainees.length ? ` + ${k.trainees.length} under oplæring` : ''}`,
  }));
  return aggregate('I2.1', items, { emptyIsMissing: false, emptyReason: 'Ingen kritiske vidensområder i udsnittet' });
}

export function i22(inp: IndicatorInput): IndicatorResult {
  const items = scopedKnowledge(inp).map((k) => ({
    key: k.id,
    label: k.area.name,
    ref: { type: 'viden' as const, id: k.id },
    weight: k.area.criticality,
    value: k.docScore,
    detail: k.docLevel === null ? 'Dokumentation ikke vurderet' : `Dokumentationsniveau ${k.docLevel} af 3`,
  }));
  return aggregate('I2.2', items, { emptyIsMissing: false, emptyReason: 'Ingen kritiske vidensområder i udsnittet' });
}

export function i23(inp: IndicatorInput): IndicatorResult {
  const items = scopedKnowledge(inp).map((k) => ({
    key: k.id,
    label: k.area.name,
    ref: { type: 'viden' as const, id: k.id },
    weight: k.area.criticality,
    value: k.rebuildScore,
    detail: k.rebuildMonths === null ? 'Kan ikke beregnes uden dokumentationsvurdering' : `Genetablering ca. ${fmtNumber(k.rebuildMonths, 0)} mdr.`,
  }));
  return aggregate('I2.3', items, { emptyIsMissing: false, emptyReason: 'Ingen kritiske vidensområder i udsnittet' });
}

// ---------------------------------------------------------------- D3

function successionItems(inp: IndicatorInput, horizon: 'nu' | '2år'): IndicatorItem[] {
  const { ctx } = inp;
  return scopedRoles(inp)
    .filter((r) => r.criticality >= CRITICALITY.criticalRole)
    .map((r) => {
      const s = inp.succession.roles.get(r.id);
      if (!s || !s.hasPlan) {
        return { key: r.id, label: r.title, ref: { type: 'rolle', id: r.id }, weight: r.criticality, value: null, detail: 'Ingen registreret successionsplan' };
      }
      const matched = horizon === 'nu' ? s.effectiveNow : s.effective2y;
      const lost = horizon === 'nu' ? s.lostToDoubleBookingNow : s.lostToDoubleBooking2y;
      const detail = matched
        ? `Dækket af ${personName(ctx, matched)}`
        : lost
          ? 'Nominel kandidat er tildelt en rolle, der prioriteres højere'
          : horizon === 'nu'
            ? 'Ingen kandidat klar nu'
            : 'Ingen kandidat klar inden for 2 år';
      return { key: r.id, label: r.title, ref: { type: 'rolle', id: r.id }, weight: r.criticality, value: matched ? 100 : 0, detail };
    });
}

export function i31(inp: IndicatorInput): IndicatorResult {
  return aggregate('I3.1', successionItems(inp, '2år'), { emptyIsMissing: false, emptyReason: 'Ingen kritiske roller i udsnittet' });
}

export function i32(inp: IndicatorInput): IndicatorResult {
  return aggregate('I3.2', successionItems(inp, 'nu'), { emptyIsMissing: false, emptyReason: 'Ingen kritiske roller i udsnittet' });
}

// ---------------------------------------------------------------- D4

function candidatePopulation(inp: IndicatorInput): { personId: Id; roleIds: Id[] }[] {
  const { ctx } = inp;
  const map = new Map<Id, Id[]>();
  for (const r of scopedRoles(inp)) {
    const plan = planAt(ctx, r.id);
    if (!plan) continue;
    const holder = activeAssignment(ctx, r.id)?.personId;
    for (const c of activeCandidates(ctx, plan)) {
      if (c.personId === holder) continue;
      map.set(c.personId, [...(map.get(c.personId) ?? []), r.id]);
    }
  }
  return [...map.entries()].map(([personId, roleIds]) => ({ personId, roleIds })).sort((a, b) => a.personId.localeCompare(b.personId));
}

const DEV_TYPES = ['udviklingsforløb', 'uddelegeret-ansvar'];

export function i41(inp: IndicatorInput): IndicatorResult {
  const { ctx } = inp;
  const items: IndicatorItem[] = scopedRoles(inp)
    .filter((r) => r.leadership)
    .map((r) => {
      const plan = planAt(ctx, r.id);
      const holder = roleHolder(ctx, r.id);
      if (!isFilled(ctx, r.id)) {
        return { key: r.id, label: r.title, ref: { type: 'rolle' as const, id: r.id }, weight: 1, value: 0, detail: 'Lederrollen er ubesat – ingen leder udvikler efterfølgere' };
      }
      if (!plan) {
        return { key: r.id, label: r.title, ref: { type: 'rolle', id: r.id }, weight: 1, value: null, detail: 'Ingen registreret successionsplan' };
      }
      const developed = activeCandidates(ctx, plan)
        .filter((c) => c.personId !== holder?.id)
        .filter((c) => evidenceActive(inp, c.personId, DEV_TYPES, ctx.asOf));
      return {
        key: r.id,
        label: r.title,
        ref: { type: 'rolle', id: r.id },
        weight: 1,
        value: developed.length > 0 ? 100 : 0,
        detail: developed.length
          ? `Udvikler ${developed.map((c) => personName(ctx, c.personId)).join(', ')}`
          : 'Ingen kandidat med dokumenteret udvikling de seneste 12 mdr.',
      };
    });
  return aggregate('I4.1', items, { emptyIsMissing: false, emptyReason: 'Ingen lederroller i udsnittet' });
}

function evidenceIndicator(inp: IndicatorInput, id: IndicatorId, types: string[], yes: string, no: string): IndicatorResult {
  const items: IndicatorItem[] = candidatePopulation(inp).map(({ personId }) => {
    const has = evidenceActive(inp, personId, types, inp.ctx.asOf);
    return { key: personId, label: personName(inp.ctx, personId), ref: { type: 'person', id: personId }, weight: 1, value: has ? 100 : 0, detail: has ? yes : no };
  });
  return aggregate(id, items, { emptyIsMissing: false, emptyReason: 'Ingen efterfølgerkandidater i udsnittet' });
}

export function i42(inp: IndicatorInput): IndicatorResult {
  return evidenceIndicator(inp, 'I4.2', ['udviklingsforløb'], 'Aktivt udviklingsforløb', 'Intet registreret udviklingsforløb');
}

export function i43(inp: IndicatorInput): IndicatorResult {
  return evidenceIndicator(inp, 'I4.3', ['uddelegeret-ansvar'], 'Har haft uddelegeret ansvar', 'Intet registreret uddelegeret ansvar');
}

export function i44(inp: IndicatorInput): IndicatorResult {
  const { ctx } = inp;
  const prev = addMonths(ctx.asOf, -WINDOWS.progressionMonths);
  const items: IndicatorItem[] = [];
  for (const r of scopedRoles(inp)) {
    const plan = planAt(ctx, r.id);
    if (!plan) continue;
    for (const c of activeCandidates(ctx, plan)) {
      const before = readinessAt(c, prev);
      const now = readinessAt(c, ctx.asOf);
      if (!before || !now) continue;
      const improved = READINESS_ORDER[now.readiness] > READINESS_ORDER[before.readiness];
      items.push({
        key: `${r.id}:${c.personId}`,
        label: `${personName(ctx, c.personId)} → ${r.title}`,
        ref: { type: 'rolle', id: r.id },
        weight: 1,
        value: improved ? 100 : 0,
        detail: `${readinessLabel(before.readiness)} → ${readinessLabel(now.readiness)}`,
      });
    }
  }
  return aggregate('I4.4', items, { minN: MIN_N['I4.4'], emptyIsMissing: false, emptyReason: 'Ingen kandidater med vurdering for 12 måneder siden' });
}

function readinessLabel(r: Readiness): string {
  return r === 'nu' ? 'klar nu' : r === '1-2' ? '1–2 år' : '3–5 år';
}

// ---------------------------------------------------------------- D5

function scopedPractices(inp: IndicatorInput) {
  return inp.ctx.data.practices.filter(
    (p) => p.registered <= inp.ctx.asOf && (inp.scope === null || p.unitIds.includes(inp.scope)),
  );
}

export function practiceAnchoring(inp: IndicatorInput, practiceId: Id): { state: 'forankret' | 'delvis' | 'personbåret'; carriers: number; formalized: boolean } {
  const p = inp.ctx.data.practices.find((x) => x.id === practiceId)!;
  const carriers = practiceCarriersAt(inp.ctx, p).length;
  const documented = valueAt(p.documented, inp.ctx.asOf)?.value ?? false;
  const formalized = practiceOwnerFilled(inp.ctx, p) && documented;
  const state = formalized && carriers >= 2 ? 'forankret' : formalized || carriers >= 2 ? 'delvis' : 'personbåret';
  return { state, carriers, formalized };
}

export function i51(inp: IndicatorInput): IndicatorResult {
  const items: IndicatorItem[] = scopedPractices(inp).map((p) => {
    const a = practiceAnchoring(inp, p.id);
    return {
      key: p.id,
      label: p.name,
      ref: { type: 'praksis', id: p.id },
      weight: p.importance,
      value: NORMALIZATION.practiceAnchoring[a.state],
      detail: `${a.carriers} bærere · ${a.formalized ? 'formel ejer og beskrevet' : 'ikke formaliseret'}`,
    };
  });
  return aggregate('I5.1', items, { emptyIsMissing: true, emptyReason: 'Praksisregistret dækker ikke udsnittet' });
}

export function i52(inp: IndicatorInput): IndicatorResult {
  const { ctx } = inp;
  const minDate = addMonths(ctx.asOf, -NORMALIZATION.adherenceMaxAgeMonths);
  const items: IndicatorItem[] = scopedPractices(inp).map((p) => {
    const v = valueAt(p.adherence, ctx.asOf);
    const ok = v && v.date >= minDate;
    return {
      key: p.id,
      label: p.name,
      ref: { type: 'praksis', id: p.id },
      weight: p.importance,
      value: ok ? v.value * 100 : null,
      detail: ok ? `${fmtPct(v.value)} af planlagte gennemførelser afholdt` : 'Ingen gennemførelsesdata for seneste 6 mdr.',
    };
  });
  return aggregate('I5.2', items, { emptyIsMissing: true, emptyReason: 'Praksisregistret dækker ikke udsnittet' });
}

export function i53(inp: IndicatorInput): IndicatorResult {
  const { ctx } = inp;
  const from = addMonths(ctx.asOf, -WINDOWS.onboardingMonths);
  const roleIds = new Set(scopedRoles(inp).map((r) => r.id));
  const items: IndicatorItem[] = ctx.data.assignments
    .filter((a) => roleIds.has(a.roleId) && a.start > from && a.start <= ctx.asOf)
    .map((a) => ({
      key: a.id,
      label: `${ctx.roleById.get(a.roleId)?.title ?? a.roleId} (${personName(ctx, a.personId)})`,
      ref: { type: 'rolle', id: a.roleId },
      weight: 1,
      value: a.onboarding ? NORMALIZATION.onboarding[a.onboarding] : null,
      detail: a.onboarding ? `Onboarding: ${a.onboarding}` : 'Onboarding ikke registreret',
    }));
  return aggregate('I5.3', items, { emptyIsMissing: false, emptyReason: 'Ingen nye besættelser af nøgleroller de seneste 12 mdr.' });
}

// ---------------------------------------------------------------- D6

export function i61(inp: IndicatorInput): IndicatorResult {
  const { ctx } = inp;
  const prevDate = addMonths(ctx.asOf, -WINDOWS.gapClosureMonths);
  const full = NORMALIZATION.gapClosureFullScore;
  const toScore = (closure: number) => Math.max(0, Math.min(100, (100 * closure) / full));
  const caps = scopedCapabilities(inp).filter((c) => (futureImportance(ctx, c.id) ?? 0) >= CRITICALITY.strategicCapability);
  const rows = caps.map((c) => {
    const now = capacityAt(c, ctx.asOf, NORMALIZATION.capacityMaxAgeMonths);
    const prev = capacityAt(c, prevDate, NORMALIZATION.capacityMaxAgeMonths);
    const gapNow = now ? Math.max(0, now.required - now.current) : null;
    const gapPrev = prev ? Math.max(0, prev.required - prev.current) : null;
    return { c, gapNow, gapPrev };
  });
  const items: IndicatorItem[] = rows.map(({ c, gapNow, gapPrev }) => {
    let value: number | null = null;
    if (gapNow !== null && gapPrev !== null) {
      value = gapPrev > 0 ? toScore((gapPrev - gapNow) / gapPrev) : gapNow === 0 ? 100 : 0;
    }
    return {
      key: c.id,
      label: c.name,
      ref: { type: 'kapabilitet', id: c.id },
      weight: gapPrev ?? 0,
      value,
      detail:
        gapNow !== null && gapPrev !== null
          ? `Gab ${fmtNumber(gapPrev, 1)} → ${fmtNumber(gapNow, 1)} årsværk`
          : 'Mangler kapacitetsdata for nu eller for 12 mdr. siden',
    };
  });
  const base = { id: 'I6.1' as const, items, n: items.length };
  const withData = rows.filter((r) => r.gapNow !== null && r.gapPrev !== null);
  if (rows.length === 0) return { ...base, nWithData: 0, value: null, coverage: 0, applicable: false, reason: 'Ingen strategiske kapabiliteter i udsnittet' };
  if (withData.length === 0) return { ...base, nWithData: 0, value: null, coverage: 0, applicable: true, reason: 'Ingen observationer med data' };
  // Samlet værdi beregnes af summen af gab – ikke som gennemsnit af enkeltkapabiliteter.
  const sumPrev = withData.reduce((s, r) => s + (r.gapPrev as number), 0);
  const sumNow = withData.reduce((s, r) => s + (r.gapNow as number), 0);
  const value = sumPrev > 0 ? toScore((sumPrev - sumNow) / sumPrev) : sumNow === 0 ? 100 : 0;
  return { ...base, nWithData: withData.length, value, coverage: withData.length / rows.length, applicable: true, reason: null };
}

export function i62(inp: IndicatorInput): IndicatorResult {
  const { ctx } = inp;
  const from = addMonths(ctx.asOf, -WINDOWS.milestoneMonths);
  const capGoals = new Set(scopedCapabilities(inp).flatMap((c) => c.goalIds));
  const items: IndicatorItem[] = [];
  for (const g of ctx.data.goals) {
    if (!capGoals.has(g.id)) continue;
    for (const m of g.milestones) {
      if (!(m.planned > from && m.planned <= ctx.asOf)) continue;
      const deadline = addDays(m.planned, NORMALIZATION.milestoneToleranceDays);
      const done = m.completed !== null && m.completed <= ctx.asOf;
      let value: number | null;
      let detail: string;
      if (done && m.completed! <= deadline) {
        value = 100;
        detail = 'Rettidigt gennemført';
      } else if (done || deadline < ctx.asOf) {
        value = 0;
        detail = done ? 'Gennemført efter tolerancen på 30 dage' : 'Ikke gennemført, tolerancen er overskredet';
      } else {
        continue; // Inden for tolerancen og endnu ikke afgjort.
      }
      items.push({ key: m.id, label: `${g.code}: ${m.title}`, ref: { type: 'milepæl', id: m.id }, weight: 1, value, detail });
    }
  }
  return aggregate('I6.2', items, { minN: MIN_N['I6.2'], emptyIsMissing: false, emptyReason: 'Ingen afgjorte milepæle de seneste 12 mdr.' });
}

export function i63(inp: IndicatorInput): IndicatorResult {
  const { ctx } = inp;
  const from = addMonths(ctx.asOf, -WINDOWS.mobilityMonths);
  const strategicRoles = new Set(
    scopedRoles(inp)
      .filter((r) => r.capabilityIds.some((cid) => (futureImportance(ctx, cid) ?? 0) >= CRITICALITY.strategicCapability))
      .map((r) => r.id),
  );
  const items: IndicatorItem[] = ctx.data.assignments
    .filter((a) => strategicRoles.has(a.roleId) && a.start > from && a.start <= ctx.asOf)
    .map((a) => ({
      key: a.id,
      label: `${ctx.roleById.get(a.roleId)?.title ?? a.roleId} (${personName(ctx, a.personId)})`,
      ref: { type: 'rolle', id: a.roleId },
      weight: 1,
      value: a.source === 'intern' ? 100 : 0,
      detail: a.source === 'intern' ? 'Besat internt' : 'Besat eksternt',
    }));
  return aggregate('I6.3', items, { minN: MIN_N['I6.3'], emptyIsMissing: false, emptyReason: 'Ingen besættelser af strategiske roller de seneste 24 mdr.' });
}

export const INDICATOR_FUNCTIONS: Record<IndicatorId, (inp: IndicatorInput) => IndicatorResult> = {
  'I1.1': i11,
  'I1.2': i12,
  'I2.1': i21,
  'I2.2': i22,
  'I2.3': i23,
  'I3.1': i31,
  'I3.2': i32,
  'I4.1': i41,
  'I4.2': i42,
  'I4.3': i43,
  'I4.4': i44,
  'I5.1': i51,
  'I5.2': i52,
  'I5.3': i53,
  'I6.1': i61,
  'I6.2': i62,
  'I6.3': i63,
};
