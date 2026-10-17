/**
 * Afledte beregninger, der deles af flere moduler (overblik, handlingsplan,
 * rapport). Alt beregnes med samme model som resten af platformen.
 */
import { useMemo } from 'react';
import type { Action, Id, StrategicGoal } from '../domain/types';
import { actionStatusAt, actionVisibleAt } from '../model/actions';
import { CRITICALITY } from '../model/config';
import type { Band, Risk } from '../model/risk';
import { runScenario, type ScenarioResult } from '../model/scenario';
import { monthsBetween } from '../model/time';
import { useApp } from './AppState';

export interface ActionEffect {
  action: Action;
  /** Højeste prioritet blandt de risici, handlingen adresserer (0 hvis ingen aktive). */
  maxPriority: number;
  risks: Risk[];
  result: ScenarioResult | null;
  orsDelta: number | null;
  decision: string;
  monthsToDue: number;
}

const DECISION: Record<Action['status'], string> = {
  planlagt: 'Godkend og bemand',
  igangsat: 'Følg op på fremdrift',
  forsinket: 'Beslut ny plan og frist',
  gennemført: 'Bekræft effekt',
};

export function useActionEffects(): ActionEffect[] {
  const { data, asOf, unitId, allRisks } = useApp();
  return useMemo(() => {
    const byId = new Map(allRisks.map((r) => [r.id, r]));
    return data.actions
      .filter((a) => actionVisibleAt(a, asOf))
      .map((raw) => {
        const action = { ...raw, status: actionStatusAt(raw, asOf) };
        const risks = action.riskIds.map((id) => byId.get(id)).filter((r): r is Risk => !!r);
        const inScope = unitId === null || risks.some((r) => r.unitIds.includes(unitId));
        const result = action.expectedChanges.length ? runScenario(data, action.expectedChanges, asOf, unitId) : null;
        const orsDelta = result && result.before.score !== null && result.after.score !== null ? result.after.score - result.before.score : null;
        return {
          action,
          maxPriority: Math.max(0, ...risks.map((r) => r.priority)),
          risks,
          result,
          orsDelta,
          decision: DECISION[action.status],
          monthsToDue: monthsBetween(asOf, action.due),
          inScope,
        };
      })
      .filter((x) => x.inScope)
      .sort((a, b) => b.maxPriority - a.maxPriority || a.action.due.localeCompare(b.action.due))
      .map(({ inScope: _ignored, ...rest }) => rest);
  }, [data, asOf, unitId, allRisks]);
}

export interface KeyPersonScenario {
  personId: Id;
  roleIds: Id[];
  result: ScenarioResult;
  delta: number | null;
  riskId: Id;
}

/**
 * Nøglepersonsscenarie til overblikket: personen bag den højest prioriterede
 * risiko, der har en person som rod (samme rækkefølge som risikoregistret).
 * Scenariet er en eksplicit antagelse – der beregnes ingen sandsynlighed for afgang.
 */
export function useKeyPersonScenario(): KeyPersonScenario | null {
  const { data, asOf, unitId, risks } = useApp();
  return useMemo(() => {
    const root = risks.find((r) => r.rootKey.startsWith('person:'));
    if (!root) return null;
    const personId = root.rootKey.slice('person:'.length);
    const result = runScenario(data, [{ type: 'personUnavailable', personId, promoteReadySuccessor: true }], asOf, unitId);
    const delta = result.before.score !== null && result.after.score !== null ? result.after.score - result.before.score : null;
    const roleIds = data.assignments
      .filter((a) => a.personId === personId && a.start <= asOf && (a.end === null || a.end >= asOf))
      .map((a) => a.roleId);
    return { personId, roleIds, result, delta, riskId: root.id };
  }, [data, asOf, unitId, risks]);
}

const BAND_RANK: Record<Band, number> = { kritisk: 4, høj: 3, moderat: 2, lav: 1 };

export interface GoalExposure {
  goal: StrategicGoal;
  risks: Risk[];
  topBand: Band | null;
  roots: number;
  nextMilestone: { title: string; planned: string; overdue: boolean } | null;
}

export function useGoalExposure(): GoalExposure[] {
  const { data, risks, asOf, unitId } = useApp();
  return useMemo(() => {
    const capsInScope = new Set(data.capabilities.filter((c) => unitId === null || c.unitId === unitId).flatMap((c) => c.goalIds));
    return data.goals
      .filter((g) => capsInScope.has(g.id))
      .map((goal) => {
        const rs = risks.filter((r) => r.goalIds.includes(goal.id));
        const topBand = rs.reduce<Band | null>((b, r) => (b === null || BAND_RANK[r.band] > BAND_RANK[b] ? r.band : b), null);
        const open = goal.milestones.filter((m) => !(m.completed && m.completed <= asOf)).sort((a, b) => a.planned.localeCompare(b.planned));
        const nm = open[0];
        return {
          goal,
          risks: rs,
          topBand,
          roots: new Set(rs.map((r) => r.rootKey)).size,
          nextMilestone: nm ? { title: nm.title, planned: nm.planned, overdue: nm.planned < asOf } : null,
        };
      });
  }, [data, risks, asOf, unitId]);
}

export function isCriticalRoleId(data: { roles: { id: Id; criticality: number }[] }, id: Id): boolean {
  return (data.roles.find((r) => r.id === id)?.criticality ?? 0) >= CRITICALITY.criticalRole;
}
