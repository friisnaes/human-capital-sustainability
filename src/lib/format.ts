/** Dansk formatering af tal og datoer. */

const nf = new Map<string, Intl.NumberFormat>();

function numberFormat(decimals: number): Intl.NumberFormat {
  const key = String(decimals);
  let f = nf.get(key);
  if (!f) {
    f = new Intl.NumberFormat('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
    nf.set(key, f);
  }
  return f;
}

/** Tal med op til `decimals` decimaler, dansk notation (1.234,5). */
export function fmtNumber(n: number, decimals = 0): string {
  return numberFormat(decimals).format(n);
}

/** Andel (0–1) som procent uden decimaler, fx "45 %". Null vises som tankestreg. */
export function fmtPct(share: number | null): string {
  if (share === null) return '—';
  return `${fmtNumber(Math.round(share * 100))} %`;
}

/** Ental eller flertal efter antal, fx plural(1, 'risiko', 'risici'). */
export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** Score som heltal. Null vises som tankestreg. */
export function fmtScore(score: number | null): string {
  return score === null ? '—' : fmtNumber(Math.round(score));
}

/** Fortegnsændring, fx "+4" eller "−3" (typografisk minus). */
export function fmtDelta(delta: number): string {
  const r = Math.round(delta);
  if (r === 0) return '±0';
  return r > 0 ? `+${fmtNumber(r)}` : `−${fmtNumber(Math.abs(r))}`;
}

const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
const MONTHS_SHORT = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];

/** 30.09.2026 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** 30. september 2026 */
export function fmtDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}. ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

/** september 2026 (fra YYYY-MM eller YYYY-MM-DD) */
export function fmtMonth(isoOrKey: string): string {
  const [y, m] = isoOrKey.split('-').map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${y}`;
}

/** sep. 2026 */
export function fmtMonthShort(isoOrKey: string): string {
  const [y, m] = isoOrKey.split('-').map(Number);
  return `${MONTHS_SHORT[(m ?? 1) - 1]} ${String(y).slice(2)}`;
}

/** Måneder som tekst, fx "ca. 15 mdr." */
export function fmtMonths(m: number | null): string {
  if (m === null) return '—';
  return `ca. ${fmtNumber(Math.round(m))} mdr.`;
}
