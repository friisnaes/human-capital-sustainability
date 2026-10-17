/**
 * CSV-eksport. Semikolon som skilletegn og UTF-8 med BOM, så filen åbner
 * korrekt i dansk Excel. Første linje markerer udsnittet som demodata.
 */

export function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(meta: string[], header: string[], rows: unknown[][]): string {
  const lines = [meta.map(csvEscape).join(';'), '', header.map(csvEscape).join(';'), ...rows.map((r) => r.map(csvEscape).join(';'))];
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
