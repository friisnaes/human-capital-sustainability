/**
 * Dataadgang.
 *
 * I demonstrationen indlæses de fiktive data fra frontend-bundtet. I en
 * produktionsløsning erstattes denne funktion af et kald til backend-API'et
 * (se docs/ARKITEKTUR.md) – resten af applikationen er uændret.
 */
import type { Dataset } from '../domain/types';
import { validateDataset, type ValidationIssue } from './validate';

export type LoadResult = { ok: true; data: Dataset } | { ok: false; error: string; issues: ValidationIssue[] };

export async function loadDataset(): Promise<LoadResult> {
  try {
    const mod = await import('./demo');
    const data = mod.demoDataset;
    const issues = validateDataset(data);
    if (issues.length > 0) {
      return { ok: false, error: 'Datagrundlaget indeholder fejl og kan ikke vises.', issues };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Ukendt fejl ved indlæsning af data.', issues: [] };
  }
}

export { HISTORY_END, HISTORY_START } from './period';
