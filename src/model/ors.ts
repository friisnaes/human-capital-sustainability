/**
 * Organizational Resilience Score™ – beregning af dimensioner og samlet score.
 *
 * Aggregering mellem enheder: Koncernscoren beregnes direkte på det samlede
 * datagrundlag (alle roller, kapabiliteter, vidensområder og praksisser) – den
 * er ikke et gennemsnit af enhedsscorerne. En enhedsscore beregnes på enhedens
 * egne observationer, mens successionsmatchingen altid sker på tværs af hele
 * organisationen.
 */
import type { Dataset, Id, ISODate } from '../domain/types';
import { CURRENT_MODEL, type DimensionId, type IndicatorId, type ModelConfig } from './config';
import { createCtx, type Ctx } from './context';
import { INDICATOR_FUNCTIONS, type IndicatorInput, type IndicatorResult } from './indicators';
import { analyzeKnowledge, type KnowledgeView } from './knowledge';
import { analyzeSuccession, type SuccessionAnalysis } from './succession';

export const DIMENSION_IDS: DimensionId[] = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'];

export const DIMENSION_INDICATORS: Record<DimensionId, IndicatorId[]> = {
  D1: ['I1.1', 'I1.2'],
  D2: ['I2.1', 'I2.2', 'I2.3'],
  D3: ['I3.1', 'I3.2'],
  D4: ['I4.1', 'I4.2', 'I4.3', 'I4.4'],
  D5: ['I5.1', 'I5.2', 'I5.3'],
  D6: ['I6.1', 'I6.2', 'I6.3'],
};

export type Status = 'robust' | 'tilstrækkelig' | 'sårbar' | 'kritisk' | 'utilstrækkelig';

export function statusFor(score: number | null, model: ModelConfig = CURRENT_MODEL): Status {
  if (score === null) return 'utilstrækkelig';
  const s = Math.round(score);
  if (s >= model.thresholds.robust) return 'robust';
  if (s >= model.thresholds.tilstrækkelig) return 'tilstrækkelig';
  if (s >= model.thresholds.sårbar) return 'sårbar';
  return 'kritisk';
}

export interface DimensionResult {
  id: DimensionId;
  /** Ubegrænset beregnet værdi (0–100) eller null ved utilstrækkeligt datagrundlag. */
  score: number | null;
  /** Værdi før datadækningskravet (til forklaring). */
  rawScore: number | null;
  coverage: number;
  sufficient: boolean;
  weight: number;
  indicators: IndicatorResult[];
  status: Status;
}

export interface OrsResult {
  modelVersion: string;
  asOf: ISODate;
  scope: Id | null;
  score: number | null;
  weightedMean: number | null;
  cap: number | null;
  capApplied: boolean;
  weakestDimension: DimensionId | null;
  /** Vægtet datadækning over alle dimensioner (0–1). */
  coverage: number;
  /** Andel af dimensionsvægten, der har en score (0–1). */
  weightCoverage: number;
  dimensions: DimensionResult[];
  status: Status;
}

/** Fælles analysegrundlag på en dato – genbruges af alle moduler. */
export interface Analysis {
  ctx: Ctx;
  succession: SuccessionAnalysis;
  knowledge: Map<Id, KnowledgeView>;
}

export function createAnalysis(data: Dataset, asOf: ISODate): Analysis {
  const ctx = createCtx(data, asOf);
  return {
    ctx,
    succession: analyzeSuccession(ctx),
    knowledge: new Map(data.knowledge.map((k) => [k.id, analyzeKnowledge(ctx, k)])),
  };
}

export function computeDimension(inp: IndicatorInput, id: DimensionId, model: ModelConfig): DimensionResult {
  const indicators = DIMENSION_INDICATORS[id].map((iid) => INDICATOR_FUNCTIONS[iid](inp));
  const w = (r: IndicatorResult) => model.indicatorWeights[r.id];
  const applicable = indicators.filter((r) => r.applicable);
  const applicableW = applicable.reduce((s, r) => s + w(r), 0);
  const coverage = applicableW > 0 ? applicable.reduce((s, r) => s + w(r) * r.coverage, 0) / applicableW : 0;
  const valued = indicators.filter((r) => r.value !== null);
  const valuedW = valued.reduce((s, r) => s + w(r), 0);
  const rawScore = valuedW > 0 ? valued.reduce((s, r) => s + w(r) * (r.value as number), 0) / valuedW : null;
  const sufficient = rawScore !== null && coverage >= model.minDimensionCoverage;
  const score = sufficient ? rawScore : null;
  return {
    id,
    score,
    rawScore,
    coverage,
    sufficient,
    weight: model.dimensionWeights[id],
    indicators,
    status: statusFor(score, model),
  };
}

export function computeOrs(analysis: Analysis, scope: Id | null, model: ModelConfig = CURRENT_MODEL): OrsResult {
  const inp: IndicatorInput = { ctx: analysis.ctx, scope, succession: analysis.succession, knowledge: analysis.knowledge };
  const dimensions = DIMENSION_IDS.map((d) => computeDimension(inp, d, model));
  const totalW = dimensions.reduce((s, d) => s + d.weight, 0);
  const scored = dimensions.filter((d) => d.score !== null);
  const scoredW = scored.reduce((s, d) => s + d.weight, 0);
  const weightCoverage = totalW > 0 ? scoredW / totalW : 0;
  const coverage = totalW > 0 ? dimensions.reduce((s, d) => s + d.weight * d.coverage, 0) / totalW : 0;

  let weightedMean: number | null = null;
  let cap: number | null = null;
  let score: number | null = null;
  let weakest: DimensionId | null = null;
  if (scored.length > 0 && weightCoverage >= model.minOrsWeightCoverage) {
    weightedMean = scored.reduce((s, d) => s + d.weight * (d.score as number), 0) / scoredW;
    const min = scored.reduce((m, d) => ((d.score as number) < (m.score as number) ? d : m));
    weakest = min.id;
    cap = model.weaknessCapPoints === null ? null : (min.score as number) + model.weaknessCapPoints;
    score = cap === null ? weightedMean : Math.min(weightedMean, cap);
  }
  return {
    modelVersion: model.version,
    asOf: analysis.ctx.asOf,
    scope,
    score,
    weightedMean,
    cap,
    capApplied: cap !== null && weightedMean !== null && cap < weightedMean,
    weakestDimension: weakest,
    coverage,
    weightCoverage,
    dimensions,
    status: statusFor(score, model),
  };
}

/** Bekvemmelighed: beregn ORS direkte fra data. */
export function orsFor(data: Dataset, asOf: ISODate, scope: Id | null, model: ModelConfig = CURRENT_MODEL): OrsResult {
  return computeOrs(createAnalysis(data, asOf), scope, model);
}
