/**
 * Future Value Matrix™
 * X: betydning for fremtidens strategi (1–5, direktionens vurdering)
 * Y: organisatorisk beredskab til at dække behovet (0–100)
 *
 * Beredskab for en kapabilitet er gennemsnittet af de komponenter, der har
 * data: kapacitetsdækning, robusthed i det svageste tilknyttede vidensområde
 * og effektiv successionsdækning i tilknyttede kritiske roller. Som i ORS
 * gælder et svaghedsloft: beredskabet kan højst være svageste komponent + 30.
 *
 * Anbefaling i feltet "høj betydning, lavt beredskab": Er kapacitetsdækningen
 * under 60 %, er opbygning af kapacitet den primære handling, fordi viden og
 * succession forudsætter, at der er mennesker at overføre til. Ellers peger
 * anbefalingen på den svageste komponent.
 */
import type { Id } from '../domain/types';
import { CRITICALITY, CURRENT_MODEL, NORMALIZATION } from './config';
import { capacityAt, futureImportance, inScope, isFilled } from './context';
import type { KnowledgeView } from './knowledge';
import type { Analysis } from './ors';

export type Quadrant = 'opbyg' | 'succession' | 'beskyt' | 'omstil' | 'fasthold' | 'overvåg';
export type Component = 'kapacitet' | 'viden' | 'succession' | 'besættelse';

export const QUADRANT_LABEL: Record<Quadrant, string> = {
  opbyg: 'Opbyg kapacitet',
  succession: 'Styrk succession',
  beskyt: 'Beskyt kritisk viden',
  omstil: 'Omstil eksisterende kapabilitet',
  fasthold: 'Fasthold og udnyt',
  overvåg: 'Overvåg',
};

export const QUADRANT_TEXT: Record<Quadrant, string> = {
  opbyg: 'Høj fremtidig betydning, men for lidt kapacitet. Rekruttér og omstil målrettet.',
  succession: 'Høj fremtidig betydning, men for få efterfølgere. Udpeg og udvikl kandidater.',
  beskyt: 'Høj fremtidig betydning, men viden er koncentreret. Overfør og dokumentér.',
  omstil: 'Moden kapabilitet med lavere fremtidig betydning. Kandidat til at frigøre ressourcer til vækstområder.',
  fasthold: 'Høj betydning og godt beredskab. Fasthold og brug som ressource for andre områder.',
  overvåg: 'Lavere betydning og lavere beredskab. Følg udviklingen uden større investering.',
};

/** Grænse på x-aksen for høj fremtidig betydning og på y-aksen for tilstrækkeligt beredskab. */
export const MATRIX_THRESHOLDS = {
  importance: 3.5,
  readiness: CURRENT_MODEL.thresholds.tilstrækkelig,
  capacityFirst: 60,
  weaknessCap: 30,
} as const;

export interface MatrixPoint {
  id: Id;
  type: 'kapabilitet' | 'rolle';
  label: string;
  unitId: Id;
  x: number | null;
  y: number | null;
  components: Partial<Record<Component, number | null>>;
  weakest: Component | null;
  size: number;
  quadrant: Quadrant | null;
}

export function knowledgeRobustness(kv: KnowledgeView): number | null {
  const w = CURRENT_MODEL.indicatorWeights;
  const parts: [number, number | null][] = [
    [w['I2.1'], kv.backupScore],
    [w['I2.2'], kv.docScore],
    [w['I2.3'], kv.rebuildScore],
  ];
  const avail = parts.filter((p): p is [number, number] => p[1] !== null);
  const tw = avail.reduce((s, p) => s + p[0], 0);
  return tw > 0 ? avail.reduce((s, p) => s + p[0] * p[1], 0) / tw : null;
}

function mean(values: (number | null)[]): number | null {
  const v = values.filter((x): x is number => x !== null);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

/** Gennemsnit af komponenter med svaghedsloft. */
export function readinessOf(components: (number | null)[]): number | null {
  const v = components.filter((x): x is number => x !== null);
  if (!v.length) return null;
  const avg = v.reduce((s, x) => s + x, 0) / v.length;
  return Math.min(avg, Math.min(...v) + MATRIX_THRESHOLDS.weaknessCap);
}

function quadrantFor(x: number | null, y: number | null, weakest: Component | null, capacity: number | null): Quadrant | null {
  if (x === null || y === null) return null;
  const high = x >= MATRIX_THRESHOLDS.importance;
  const ready = Math.round(y) >= MATRIX_THRESHOLDS.readiness;
  if (high && ready) return 'fasthold';
  if (!high && ready) return 'omstil';
  if (!high && !ready) return 'overvåg';
  if (capacity !== null && capacity < MATRIX_THRESHOLDS.capacityFirst) return 'opbyg';
  if (weakest === 'viden') return 'beskyt';
  if (weakest === 'succession' || weakest === 'besættelse') return 'succession';
  return 'opbyg';
}

function weakestOf(c: Partial<Record<Component, number | null>>): Component | null {
  let best: Component | null = null;
  let bestV = Infinity;
  for (const [k, v] of Object.entries(c) as [Component, number | null][]) {
    if (v !== null && v !== undefined && v < bestV) {
      bestV = v;
      best = k;
    }
  }
  return best;
}

export function capabilityPoints(a: Analysis, scope: Id | null): MatrixPoint[] {
  const { ctx } = a;
  return ctx.data.capabilities
    .filter((c) => inScope(c.unitId, scope))
    .map((c) => {
      const cp = capacityAt(c, ctx.asOf, NORMALIZATION.capacityMaxAgeMonths);
      const capacity = cp && cp.required > 0 ? Math.min(1, cp.current / cp.required) * 100 : null;
      const kvs = [...a.knowledge.values()].filter((k) => k.area.capabilityIds.includes(c.id) && k.area.criticality >= CRITICALITY.knowledgeInScope);
      const kScores = kvs.map(knowledgeRobustness).filter((v): v is number => v !== null);
      const knowledge = kScores.length ? Math.min(...kScores) : null;
      const roles = ctx.data.roles.filter((r) => r.capabilityIds.includes(c.id) && r.criticality >= CRITICALITY.criticalRole);
      const succession = roles.length
        ? mean(roles.map((r) => {
            const s = a.succession.roles.get(r.id);
            return s && s.hasPlan ? (s.effective2y ? 100 : 0) : null;
          }))
        : null;
      const components = { kapacitet: capacity, viden: knowledge, succession };
      const x = futureImportance(ctx, c.id);
      const y = readinessOf([capacity, knowledge, succession]);
      const weakest = weakestOf(components);
      return {
        id: c.id,
        type: 'kapabilitet' as const,
        label: c.name,
        unitId: c.unitId,
        x,
        y,
        components,
        weakest,
        size: cp?.required ?? 1,
        quadrant: quadrantFor(x, y, weakest, capacity),
      };
    });
}

export function rolePoints(a: Analysis, scope: Id | null): MatrixPoint[] {
  const { ctx } = a;
  return ctx.data.roles
    .filter((r) => inScope(r.unitId, scope))
    .map((r) => {
      const s = a.succession.roles.get(r.id);
      const succession = s && s.hasPlan ? (s.effective2y ? 100 : s.candidates.length ? 35 : 0) : null;
      const holder = s?.holderId ?? null;
      const kvs = holder ? [...a.knowledge.values()].filter((k) => k.qualified.some((h) => h.personId === holder) && k.area.criticality >= CRITICALITY.knowledgeInScope) : [];
      const knowledge = kvs.length ? mean(kvs.map(knowledgeRobustness)) : null;
      const filled = isFilled(ctx, r.id) ? 100 : 0;
      const components = { succession, viden: knowledge, besættelse: filled };
      const xs = r.capabilityIds.map((c) => futureImportance(ctx, c)).filter((v): v is NonNullable<typeof v> => v !== null);
      const x = xs.length ? Math.max(...xs) : null;
      const y = readinessOf([succession, knowledge, filled]);
      const weakest = weakestOf(components);
      return {
        id: r.id,
        type: 'rolle' as const,
        label: r.title,
        unitId: r.unitId,
        x,
        y,
        components,
        weakest,
        size: r.criticality,
        quadrant: quadrantFor(x, y, weakest, null),
      };
    });
}
