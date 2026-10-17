/**
 * Historik. Hvert måneds-snapshot genberegnes fra de daterede grunddata.
 *
 * Der vises to serier:
 *  - "Rapporteret": scoren beregnet med den modelversion, der var gældende i måneden.
 *  - "Genberegnet": scoren beregnet med den gældende modelversion, så perioder
 *    kan sammenlignes på samme grundlag.
 * Ændringer i model eller datagrundlag markeres eksplicit.
 */
import type { Dataset, Id, ISODate } from '../domain/types';
import { CURRENT_MODEL, MODEL_VERSIONS, modelAt, type DimensionId } from './config';
import { computeOrs, createAnalysis, type OrsResult } from './ors';
import { monthEnds, periodKey } from './time';
import { fmtMonth } from '../lib/format';

export interface Snapshot {
  date: ISODate;
  period: string;
  modelVersionAtTime: string;
  reported: OrsResult;
  current: OrsResult;
}

export interface HistoryEvent {
  date: ISODate;
  kind: 'model' | 'datagrundlag';
  text: string;
}

export interface History {
  snapshots: Snapshot[];
  events: HistoryEvent[];
}

const DIM_NAMES: Record<DimensionId, string> = {
  D1: 'Strategisk eksekveringskapacitet',
  D2: 'Robusthed i kritisk viden',
  D3: 'Successionsberedskab',
  D4: 'Ledelsesudviklingskapacitet',
  D5: 'Kulturel kontinuitet',
  D6: 'Tilpasningsevne',
};

export function computeHistory(data: Dataset, scope: Id | null, start: ISODate, end: ISODate): History {
  const snapshots: Snapshot[] = monthEnds(start, end).map((date) => {
    const analysis = createAnalysis(data, date);
    const atTime = modelAt(date);
    const current = computeOrs(analysis, scope, CURRENT_MODEL);
    const reported = atTime.version === CURRENT_MODEL.version ? current : computeOrs(analysis, scope, atTime);
    return { date, period: periodKey(date), modelVersionAtTime: atTime.version, reported, current };
  });

  const events: HistoryEvent[] = [];
  for (const m of MODEL_VERSIONS) {
    if (m.validFrom > start && m.validFrom <= end) {
      events.push({ date: m.validFrom, kind: 'model', text: `Model ${m.version} gældende fra ${fmtMonth(m.validFrom)}: ${m.changeNote}` });
    }
  }
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1]!;
    const cur = snapshots[i]!;
    for (let d = 0; d < cur.current.dimensions.length; d++) {
      const a = prev.current.dimensions[d]!;
      const b = cur.current.dimensions[d]!;
      if (a.score === null && b.score !== null) {
        events.push({ date: cur.date, kind: 'datagrundlag', text: `${DIM_NAMES[b.id]} indgår fra ${fmtMonth(cur.date)}, fordi datagrundlaget nu er tilstrækkeligt.` });
      } else if (a.score !== null && b.score === null) {
        events.push({ date: cur.date, kind: 'datagrundlag', text: `${DIM_NAMES[b.id]} udgår fra ${fmtMonth(cur.date)} på grund af utilstrækkeligt datagrundlag.` });
      }
    }
  }
  events.sort((x, y) => x.date.localeCompare(y.date));
  return { snapshots, events };
}

/** Snapshot et antal måneder før den valgte periode (eller undefined). */
export function snapshotBefore(history: History, date: ISODate, months: number): Snapshot | undefined {
  const idx = history.snapshots.findIndex((s) => s.date === date);
  if (idx < 0) return undefined;
  return history.snapshots[idx - months];
}

export { DIM_NAMES };
