/**
 * Datakvalitet – holdes adskilt fra scoren.
 *
 * Datakvalitet beskriver, hvor fuldstændigt, aktuelt og dokumenteret
 * datagrundlaget er. Den er IKKE et udtryk for statistisk sikkerhed, og
 * den ændrer ikke scoren.
 */
import type { Id } from '../domain/types';
import { CRITICALITY, NORMALIZATION, WINDOWS } from './config';
import { capacityAt, inScope } from './context';
import type { Analysis, OrsResult } from './ors';
import { addMonths, valueAt } from './time';

export type QualityLevel = 'høj' | 'middel' | 'lav';

export interface DataQuality {
  level: QualityLevel;
  /** Vægtet datadækning (fra ORS-beregningen). */
  coverage: number;
  /** Andel af tidsfølsomme datapunkter, der er aktuelle (null = intet at kontrollere). */
  freshness: number | null;
  /** Andel af beredskabsvurderinger, der hviler på dokumenteret evidens. */
  documentedShare: number | null;
  stale: { label: string; detail: string }[];
}

export function computeDataQuality(a: Analysis, scope: Id | null, ors: OrsResult): DataQuality {
  const { ctx } = a;
  const checks: { ok: boolean; label: string; detail: string }[] = [];

  for (const role of ctx.data.roles) {
    if (!inScope(role.unitId, scope) || role.criticality < CRITICALITY.criticalRole) continue;
    const s = a.succession.roles.get(role.id);
    if (!s?.hasPlan || !s.lastReview) continue;
    const ok = s.lastReview >= addMonths(ctx.asOf, -WINDOWS.planReviewMaxAgeMonths);
    checks.push({ ok, label: `Successionsplan: ${role.title}`, detail: `Seneste review ${s.lastReview.split('-').reverse().join('.')}` });
  }
  for (const kv of a.knowledge.values()) {
    if (!inScope(kv.area.unitId, scope) || kv.area.criticality < CRITICALITY.knowledgeInScope || !kv.docAssessed) continue;
    const ok = kv.docAssessed >= addMonths(ctx.asOf, -WINDOWS.docAssessmentMaxAgeMonths);
    checks.push({ ok, label: `Dokumentationsvurdering: ${kv.area.name}`, detail: `Vurderet ${kv.docAssessed.split('-').reverse().join('.')}` });
  }
  for (const c of ctx.data.capabilities) {
    if (!inScope(c.unitId, scope)) continue;
    const ok = capacityAt(c, ctx.asOf, NORMALIZATION.capacityMaxAgeMonths) !== null;
    const last = valueAt(c.capacity, ctx.asOf)?.date;
    checks.push({ ok, label: `Kapacitetsopgørelse: ${c.name}`, detail: last ? `Seneste opgørelse ${last.split('-').reverse().join('.')}` : 'Ingen opgørelse' });
  }
  for (const p of ctx.data.practices) {
    if (p.registered > ctx.asOf || (scope !== null && !p.unitIds.includes(scope))) continue;
    const v = valueAt(p.adherence, ctx.asOf);
    const ok = !!v && v.date >= addMonths(ctx.asOf, -NORMALIZATION.adherenceMaxAgeMonths);
    checks.push({ ok, label: `Gennemførelse: ${p.name}`, detail: v ? `Seneste opgørelse ${v.date.split('-').reverse().join('.')}` : 'Ingen opgørelse' });
  }

  const freshness = checks.length ? checks.filter((c) => c.ok).length / checks.length : null;

  let documented = 0;
  let total = 0;
  for (const role of ctx.data.roles) {
    if (!inScope(role.unitId, scope)) continue;
    for (const c of a.succession.roles.get(role.id)?.candidates ?? []) {
      if (!c.basis) continue;
      total += 1;
      if (c.basis === 'dokumenteret') documented += 1;
    }
  }
  const documentedShare = total ? documented / total : null;

  const coverage = ors.coverage;
  const level: QualityLevel =
    freshness !== null && coverage >= 0.9 && freshness >= 0.85 && (documentedShare ?? 0) >= 0.5
      ? 'høj'
      : freshness !== null && coverage >= 0.75 && freshness >= 0.6
        ? 'middel'
        : 'lav';

  return {
    level,
    coverage,
    freshness,
    documentedShare,
    stale: checks.filter((c) => !c.ok).map(({ label, detail }) => ({ label, detail })),
  };
}
