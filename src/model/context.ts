/**
 * Opslagsfunktioner, der besvarer "hvordan så data ud på datoen T?".
 * Alle funktioner er rene og afhænger kun af datasættet og datoen.
 */
import type {
  Assessment,
  Assignment,
  Capability,
  CapacityPoint,
  CulturePractice,
  Dataset,
  DocLevel,
  Id,
  ISODate,
  KnowledgeArea,
  KnowledgeHolder,
  Person,
  ReadinessAssessment,
  Role,
  Scale5,
  SuccessionPlan,
  SuccessorCandidate,
} from '../domain/types';
import { activeAt, addMonths, valueAt } from './time';

export interface Ctx {
  data: Dataset;
  asOf: ISODate;
  personById: Map<Id, Person>;
  roleById: Map<Id, Role>;
  capabilityById: Map<Id, Capability>;
  knowledgeById: Map<Id, KnowledgeArea>;
  planByRole: Map<Id, SuccessionPlan>;
}

export function createCtx(data: Dataset, asOf: ISODate): Ctx {
  return {
    data,
    asOf,
    personById: new Map(data.persons.map((p) => [p.id, p])),
    roleById: new Map(data.roles.map((r) => [r.id, r])),
    capabilityById: new Map(data.capabilities.map((c) => [c.id, c])),
    knowledgeById: new Map(data.knowledge.map((k) => [k.id, k])),
    planByRole: new Map(data.successionPlans.map((s) => [s.roleId, s])),
  };
}

/** Er personen ansat (og tilgængelig) på datoen? */
export function isEmployed(ctx: Ctx, personId: Id, date: ISODate = ctx.asOf): boolean {
  const p = ctx.personById.get(personId);
  return !!p && activeAt(p.employedFrom, p.employedTo, date);
}

export function activeAssignment(ctx: Ctx, roleId: Id, date: ISODate = ctx.asOf): Assignment | undefined {
  return ctx.data.assignments.find(
    (a) => a.roleId === roleId && activeAt(a.start, a.end, date) && isEmployed(ctx, a.personId, date),
  );
}

export function roleHolder(ctx: Ctx, roleId: Id, date: ISODate = ctx.asOf): Person | undefined {
  const a = activeAssignment(ctx, roleId, date);
  return a ? ctx.personById.get(a.personId) : undefined;
}

export function rolesHeldBy(ctx: Ctx, personId: Id, date: ISODate = ctx.asOf): Role[] {
  return ctx.data.assignments
    .filter((a) => a.personId === personId && activeAt(a.start, a.end, date) && isEmployed(ctx, personId, date))
    .map((a) => ctx.roleById.get(a.roleId))
    .filter((r): r is Role => !!r);
}

export function isFilled(ctx: Ctx, roleId: Id, date: ISODate = ctx.asOf): boolean {
  return !!activeAssignment(ctx, roleId, date);
}

/** Kapacitetsdata på datoen; data ældre end maxAgeMonths regnes som manglende. */
export function capacityAt(cap: Capability, date: ISODate, maxAgeMonths: number): CapacityPoint | null {
  const point = valueAt(cap.capacity, date);
  if (!point) return null;
  if (point.date < addMonths(date, -maxAgeMonths)) return null;
  return point.value;
}

/** Seneste vurdering af fremtidig betydning for en kapabilitet. */
export function futureImportanceAssessment(ctx: Ctx, capabilityId: Id, date: ISODate = ctx.asOf): Assessment | undefined {
  let best: Assessment | undefined;
  for (const a of ctx.data.assessments) {
    if (a.kind !== 'fremtidig-betydning' || a.subjectId !== capabilityId || a.date > date) continue;
    if (!best || a.date >= best.date) best = a;
  }
  return best;
}

export function futureImportance(ctx: Ctx, capabilityId: Id, date: ISODate = ctx.asOf): Scale5 | null {
  return futureImportanceAssessment(ctx, capabilityId, date)?.value ?? null;
}

/** Vidensholdere, der er aktive og ansat på datoen. */
export function holdersAt(ctx: Ctx, k: KnowledgeArea, date: ISODate = ctx.asOf): KnowledgeHolder[] {
  return k.holders.filter((h) => activeAt(h.from, h.to, date) && isEmployed(ctx, h.personId, date));
}

export function qualifiedHolders(ctx: Ctx, k: KnowledgeArea, date: ISODate = ctx.asOf): KnowledgeHolder[] {
  return holdersAt(ctx, k, date).filter((h) => h.level === 'ekspert' || h.level === 'praktiker');
}

export function docLevelAt(k: KnowledgeArea, date: ISODate): { level: DocLevel; assessed: ISODate } | null {
  const v = valueAt(k.documentation, date);
  return v ? { level: v.value, assessed: v.date } : null;
}

/** Kandidater, der er aktive i planen og ansat på datoen. */
export function activeCandidates(ctx: Ctx, plan: SuccessionPlan, date: ISODate = ctx.asOf): SuccessorCandidate[] {
  return plan.candidates.filter((c) => activeAt(c.from, c.to, date) && isEmployed(ctx, c.personId, date));
}

export function readinessAt(c: SuccessorCandidate, date: ISODate): ReadinessAssessment | undefined {
  let best: ReadinessAssessment | undefined;
  for (const a of c.assessments) if (a.date <= date && (!best || a.date >= best.date)) best = a;
  return best;
}

/** Successionsplanen gælder kun fra etableringsdatoen. */
export function planAt(ctx: Ctx, roleId: Id, date: ISODate = ctx.asOf): SuccessionPlan | undefined {
  const plan = ctx.planByRole.get(roleId);
  return plan && plan.established <= date ? plan : undefined;
}

export function lastReview(plan: SuccessionPlan, date: ISODate): ISODate | null {
  const past = plan.reviews.filter((d) => d <= date).sort();
  return past.length ? past[past.length - 1]! : plan.established <= date ? plan.established : null;
}

export function practiceRegistered(p: CulturePractice, date: ISODate): boolean {
  return p.registered <= date;
}

export function practiceCarriersAt(ctx: Ctx, p: CulturePractice, date: ISODate = ctx.asOf) {
  // Én person tælles kun én gang, selv om den står flere gange i registret.
  const seen = new Set<Id>();
  return p.carriers.filter((c) => {
    if (!activeAt(c.from, c.to, date) || !isEmployed(ctx, c.personId, date) || seen.has(c.personId)) return false;
    seen.add(c.personId);
    return true;
  });
}

export function practiceOwnerFilled(ctx: Ctx, p: CulturePractice, date: ISODate = ctx.asOf): boolean {
  return p.ownerRoleId !== null && isFilled(ctx, p.ownerRoleId, date);
}

/** Enheder i et scope: null = hele organisationen. */
export function inScope(unitId: Id, scopeUnitId: Id | null): boolean {
  return scopeUnitId === null || unitId === scopeUnitId;
}

export function personName(ctx: Ctx, id: Id | null | undefined): string {
  if (!id) return '—';
  return ctx.personById.get(id)?.name ?? id;
}

export function roleTitle(ctx: Ctx, id: Id | null | undefined): string {
  if (!id) return '—';
  return ctx.roleById.get(id)?.title ?? id;
}
