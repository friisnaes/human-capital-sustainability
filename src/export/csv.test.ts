import { describe, expect, it } from 'vitest';
import { demoDataset } from '../data/demo';
import { createAnalysis } from '../model/ors';
import { computeRisks } from '../model/risk';
import { csvEscape, toCsv } from './csv';
import { riskCsv } from './riskCsv';

describe('CSV-eksport', () => {
  it('escaper semikolon, anførselstegn og linjeskift', () => {
    expect(csvEscape('a;b')).toBe('"a;b"');
    expect(csvEscape('sagde "hej"')).toBe('"sagde ""hej"""');
    expect(csvEscape(null)).toBe('');
  });
  it('starter med BOM og demomarkering', () => {
    const csv = toCsv(['FIKTIVE DEMODATA'], ['a'], [[1]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('FIKTIVE DEMODATA');
  });
  it('eksporterer præcis det aktuelle udsnit med model og filtre', () => {
    const risks = computeRisks(createAnalysis(demoDataset, '2026-09-30')).filter((r) => r.unitId === 'DIG');
    const csv = riskCsv(demoDataset, risks, { asOf: '2026-09-30', unitId: 'DIG', filters: 'bånd: Kritisk', exportedAt: new Date('2026-10-16T12:00:00Z') });
    const lines = csv.replace('﻿', '').trim().split('\r\n');
    expect(lines[0]).toContain('Enhed: Digitale Services');
    expect(lines[0]).toContain('Model: ORS v1.1');
    expect(lines.length).toBe(3 + risks.length);
    for (const r of risks) expect(csv).toContain(r.id);
  });
});
