/** Rene datofunktioner. Alle datoer er ISO-strenge (YYYY-MM-DD) i lokal kalendertid. */
import type { Dated, ISODate } from '../domain/types';

function parts(d: ISODate): [number, number, number] {
  const [y, m, day] = d.split('-').map(Number);
  return [y ?? 0, m ?? 1, day ?? 1];
}

function fmt(y: number, m: number, d: number): ISODate {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Lægger måneder til en dato. Slutningen af måneden bevares (31. jan + 1 = 28./29. feb). */
export function addMonths(d: ISODate, months: number): ISODate {
  const [y, m, day] = parts(d);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const isMonthEnd = day === daysInMonth(y, m);
  const nd = isMonthEnd ? daysInMonth(ny, nm) : Math.min(day, daysInMonth(ny, nm));
  return fmt(ny, nm, nd);
}

export function addDays(d: ISODate, days: number): ISODate {
  const [y, m, day] = parts(d);
  const t = new Date(Date.UTC(y, m - 1, day + days));
  return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function endOfMonth(d: ISODate): ISODate {
  const [y, m] = parts(d);
  return fmt(y, m, daysInMonth(y, m));
}

/** Antal dage mellem to datoer (b − a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  const [y1, m1, d1] = parts(a);
  const [y2, m2, d2] = parts(b);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** Hele måneder mellem to datoer (afrundet ned). */
export function monthsBetween(a: ISODate, b: ISODate): number {
  return Math.floor(daysBetween(a, b) / 30.4375);
}

/** Er perioden [from; to] aktiv på datoen? to = null betyder åben periode. */
export function activeAt(from: ISODate, to: ISODate | null, date: ISODate): boolean {
  return from <= date && (to === null || to >= date);
}

/** Overlapper perioden [from; to] vinduet [winStart; winEnd]? */
export function overlaps(from: ISODate, to: ISODate | null, winStart: ISODate, winEnd: ISODate): boolean {
  return from <= winEnd && (to === null || to >= winStart);
}

/** Seneste værdi i et dateret forløb på eller før datoen. */
export function valueAt<T>(timeline: Dated<T>[], date: ISODate): Dated<T> | undefined {
  let best: Dated<T> | undefined;
  for (const point of timeline) {
    if (point.date <= date && (!best || point.date >= best.date)) best = point;
  }
  return best;
}

/** Månedsultimo-datoer fra og med start til og med slut. */
export function monthEnds(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = [];
  let cur = endOfMonth(start);
  const last = endOfMonth(end);
  while (cur <= last) {
    out.push(cur);
    cur = addMonths(cur, 1);
  }
  return out;
}

/** Periode-nøgle (YYYY-MM) for en dato. */
export function periodKey(d: ISODate): string {
  return d.slice(0, 7);
}

/** Månedsultimo for en periode-nøgle (YYYY-MM). */
export function periodEnd(key: string): ISODate {
  return endOfMonth(`${key}-01`);
}
