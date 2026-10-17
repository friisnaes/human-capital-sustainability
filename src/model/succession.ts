/**
 * Successionsanalyse og effektiv dækning.
 *
 * Nominel dækning: rollen har mindst én kandidat med det krævede beredskab.
 * Effektiv dækning: hver kandidat kan kun dække ét behov ad gangen. Kandidater
 * fordeles mellem roller med en matching, der behandler roller i prioritets-
 * rækkefølge (se rolePriority) og bruger forøgende stier, så en rolle, der
 * først er dækket, aldrig mister dækning til en lavere prioriteret rolle.
 * Matching sker på tværs af hele organisationen – også når der filtreres på
 * én enhed – fordi en kandidat ikke kan dække to roller i forskellige enheder.
 */
import type { Basis, Id, ISODate, Readiness } from '../domain/types';
import { activeCandidates, type Ctx, futureImportance, planAt, readinessAt, roleHolder, lastReview } from './context';

export type Horizon = 'nu' | '2år';

export const READINESS_ORDER: Record<Readiness, number> = { '3-5': 1, '1-2': 2, nu: 3 };

export function readinessMeets(r: Readiness, horizon: Horizon): boolean {
  return horizon === 'nu' ? r === 'nu' : r === 'nu' || r === '1-2';
}

export interface CandidateView {
  personId: Id;
  readiness: Readiness | null;
  basis: Basis | null;
  assessedOn: ISODate | null;
  assessorRoleId: Id | null;
  evidenceIds: Id[];
  developmentNeeds: string[];
  /** Andre roller, hvor personen er kandidat med beredskab inden for 2 år. */
  alsoCandidateFor: Id[];
}

export interface RoleSuccession {
  roleId: Id;
  criticality: number;
  hasPlan: boolean;
  planId: Id | null;
  lastReview: ISODate | null;
  holderId: Id | null;
  candidates: CandidateView[];
  nominalNow: boolean;
  nominal2y: boolean;
  /** Kandidat tildelt rollen i den effektive matching (beredskab nu). */
  effectiveNow: Id | null;
  /** Kandidat tildelt rollen i den effektive matching (beredskab inden for 2 år). */
  effective2y: Id | null;
  /** Rollen har nominel dækning, men mister den i den effektive fordeling. */
  lostToDoubleBooking2y: boolean;
  lostToDoubleBookingNow: boolean;
}

export interface SuccessionAnalysis {
  roles: Map<Id, RoleSuccession>;
  /** Personer, der er kandidat med beredskab ≤ 2 år til flere roller samtidig. */
  shared: Map<Id, Id[]>;
}

function eligible(ctx: Ctx, roleId: Id, horizon: Horizon, date: ISODate): Id[] {
  const plan = planAt(ctx, roleId, date);
  if (!plan) return [];
  const holder = roleHolder(ctx, roleId, date)?.id;
  return activeCandidates(ctx, plan, date)
    .filter((c) => c.personId !== holder)
    .map((c) => ({ c, r: readinessAt(c, date) }))
    .filter((x) => x.r && readinessMeets(x.r.readiness, horizon))
    .sort((a, b) => READINESS_ORDER[b.r!.readiness] - READINESS_ORDER[a.r!.readiness] || a.c.personId.localeCompare(b.c.personId))
    .map((x) => x.c.personId);
}

/**
 * Prioriteret bipartit matching (Kuhns algoritme med roller i kritikalitetsorden).
 * Returnerer rolle → person.
 */
/**
 * Prioritetsrækkefølge for roller i fordelingen af efterfølgere:
 * 1) kritikalitet, 2) højeste fremtidige betydning blandt rollens kapabiliteter,
 * 3) tidligste frist blandt de strategiske mål, rollen bidrager til, 4) id (kun som sidste udvej).
 */
export function rolePriority(ctx: Ctx, date: ISODate = ctx.asOf): Id[] {
  const key = (r: (typeof ctx.data.roles)[number]) => {
    const fi = Math.max(0, ...r.capabilityIds.map((c) => futureImportance(ctx, c, date) ?? 0));
    const deadlines = r.capabilityIds.flatMap((c) => ctx.capabilityById.get(c)?.goalIds ?? []).map((g) => ctx.data.goals.find((x) => x.id === g)?.deadline ?? '9999-12-31');
    return { fi, deadline: deadlines.sort()[0] ?? '9999-12-31' };
  };
  return [...ctx.data.roles]
    .map((r) => ({ r, k: key(r) }))
    .sort((a, b) => b.r.criticality - a.r.criticality || b.k.fi - a.k.fi || a.k.deadline.localeCompare(b.k.deadline) || a.r.id.localeCompare(b.r.id))
    .map((x) => x.r.id);
}

export function matchSuccessors(ctx: Ctx, horizon: Horizon, date: ISODate = ctx.asOf): Map<Id, Id> {
  const roles = rolePriority(ctx, date).map((id) => ctx.roleById.get(id)!);
  const options = new Map<Id, Id[]>(roles.map((r) => [r.id, eligible(ctx, r.id, horizon, date)]));
  const personToRole = new Map<Id, Id>();

  const tryAssign = (roleId: Id, visited: Set<Id>): boolean => {
    for (const personId of options.get(roleId) ?? []) {
      if (visited.has(personId)) continue;
      visited.add(personId);
      const current = personToRole.get(personId);
      if (current === undefined || tryAssign(current, visited)) {
        personToRole.set(personId, roleId);
        return true;
      }
    }
    return false;
  };

  for (const r of roles) tryAssign(r.id, new Set());
  const roleToPerson = new Map<Id, Id>();
  for (const [personId, roleId] of personToRole) roleToPerson.set(roleId, personId);
  return roleToPerson;
}

export function analyzeSuccession(ctx: Ctx, date: ISODate = ctx.asOf): SuccessionAnalysis {
  const now = matchSuccessors(ctx, 'nu', date);
  const two = matchSuccessors(ctx, '2år', date);

  const shared = new Map<Id, Id[]>();
  for (const r of ctx.data.roles) {
    for (const p of eligible(ctx, r.id, '2år', date)) {
      shared.set(p, [...(shared.get(p) ?? []), r.id]);
    }
  }
  for (const [p, rs] of [...shared]) if (rs.length < 2) shared.delete(p);

  const roles = new Map<Id, RoleSuccession>();
  for (const role of ctx.data.roles) {
    const plan = planAt(ctx, role.id, date);
    const holderId = roleHolder(ctx, role.id, date)?.id ?? null;
    const candidates: CandidateView[] = plan
      ? activeCandidates(ctx, plan, date)
          .filter((c) => c.personId !== holderId)
          .map((c) => {
            const r = readinessAt(c, date);
            return {
              personId: c.personId,
              readiness: r?.readiness ?? null,
              basis: r?.basis ?? null,
              assessedOn: r?.date ?? null,
              assessorRoleId: r?.assessorRoleId ?? null,
              evidenceIds: r?.evidenceIds ?? [],
              developmentNeeds: c.developmentNeeds,
              alsoCandidateFor: (shared.get(c.personId) ?? []).filter((id) => id !== role.id),
            };
          })
          .sort((a, b) => (b.readiness ? READINESS_ORDER[b.readiness] : 0) - (a.readiness ? READINESS_ORDER[a.readiness] : 0))
      : [];
    const nominalNow = candidates.some((c) => c.readiness && readinessMeets(c.readiness, 'nu'));
    const nominal2y = candidates.some((c) => c.readiness && readinessMeets(c.readiness, '2år'));
    const effectiveNow = now.get(role.id) ?? null;
    const effective2y = two.get(role.id) ?? null;
    roles.set(role.id, {
      roleId: role.id,
      criticality: role.criticality,
      hasPlan: !!plan,
      planId: plan?.id ?? null,
      lastReview: plan ? lastReview(plan, date) : null,
      holderId,
      candidates,
      nominalNow,
      nominal2y,
      effectiveNow,
      effective2y,
      lostToDoubleBooking2y: nominal2y && !effective2y,
      lostToDoubleBookingNow: nominalNow && !effectiveNow,
    });
  }
  return { roles, shared };
}
