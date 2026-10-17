/** Analyse af kritisk viden: backup, dokumentation og genetableringstid. */
import type { DocLevel, Id, ISODate, KnowledgeArea, KnowledgeHolder } from '../domain/types';
import { NORMALIZATION } from './config';
import { type Ctx, docLevelAt, holdersAt } from './context';

export interface KnowledgeView {
  id: Id;
  area: KnowledgeArea;
  qualified: KnowledgeHolder[];
  trainees: KnowledgeHolder[];
  docLevel: DocLevel | null;
  docAssessed: ISODate | null;
  /** Genetableringstid i måneder ved tab af den primære vidensholder. */
  rebuildMonths: number | null;
  backupScore: number;
  docScore: number | null;
  rebuildScore: number | null;
  /** Kun én kvalificeret holder. */
  singlePerson: boolean;
  /** Ingen kvalificerede holdere tilbage. */
  lost: boolean;
}

export function rebuildMonths(qualifiedCount: number, base: number, doc: DocLevel | null): number | null {
  if (qualifiedCount >= 2) return NORMALIZATION.rebuildWithBackupMonths;
  if (doc === null) return null;
  return Math.round(base * NORMALIZATION.docRebuildFactor[doc] * 10) / 10;
}

export function rebuildScore(months: number | null): number | null {
  if (months === null) return null;
  const { rebuildBestMonths: best, rebuildWorstMonths: worst } = NORMALIZATION;
  const s = (100 * (worst - months)) / (worst - best);
  return Math.max(0, Math.min(100, s));
}

export function analyzeKnowledge(ctx: Ctx, k: KnowledgeArea, date: ISODate = ctx.asOf): KnowledgeView {
  const holders = holdersAt(ctx, k, date);
  const qualified = holders.filter((h) => h.level !== 'under oplæring');
  const trainees = holders.filter((h) => h.level === 'under oplæring');
  const doc = docLevelAt(k, date);
  const months = rebuildMonths(qualified.length, k.baseRebuildMonths, doc?.level ?? null);
  return {
    id: k.id,
    area: k,
    qualified,
    trainees,
    docLevel: doc?.level ?? null,
    docAssessed: doc?.assessed ?? null,
    rebuildMonths: months,
    backupScore: NORMALIZATION.backupHolders(qualified.length),
    docScore: doc ? NORMALIZATION.documentation[doc.level] : null,
    // Er der ingen kvalificerede holdere, er viden allerede tabt: genetableringsscoren er 0.
    rebuildScore: qualified.length === 0 ? (doc ? 0 : null) : rebuildScore(months),
    singlePerson: qualified.length === 1,
    lost: qualified.length === 0,
  };
}
