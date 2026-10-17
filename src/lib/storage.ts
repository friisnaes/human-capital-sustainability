/**
 * Lokal lagring i browseren (kun bekvemmelighed i demonstrationen).
 * Alle kald er beskyttet, så siden virker, hvis lagring er blokeret.
 * Grunddata gemmes aldrig – kun brugerens valg, fx senest anvendte scenarie.
 */
const PREFIX = 'hcs-demo:';

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* Lagring utilgængelig – ignorér. */
  }
}

/** Antal gemte nøgler (bruges til at vise, om der er noget at nulstille). */
export function countLocal(): number {
  try {
    let n = 0;
    for (let i = 0; i < window.localStorage.length; i++) if (window.localStorage.key(i)?.startsWith(PREFIX)) n += 1;
    return n;
  } catch {
    return 0;
  }
}

export function clearLocal(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignorér */
  }
}
