import { describe, expect, it } from 'vitest';
import { demoDataset, HISTORY_END, HISTORY_START } from '../data/demo';
import { validateDataset } from '../data/validate';
import { changesFor, DEFAULT_PARAMS } from '../data/scenarios';
import { CURRENT_MODEL, MODEL_V1_0, MODEL_V1_1, modelAt } from './config';
import { createCtx, practiceCarriersAt } from './context';
import { aggregate } from './indicators';
import { rebuildMonths, rebuildScore } from './knowledge';
import { computeOrs, createAnalysis, orsFor, statusFor } from './ors';
import { bandOf, computeRisks, priorityOf, topDistinctRisks } from './risk';
import { applyChanges, runScenario } from './scenario';
import { matchSuccessors } from './succession';
import { computeHistory } from './history';
import { capabilityPoints, readinessOf } from './matrix';
import { computeFindings, singlePersonDependencies } from './dependencies';
import { addMonths, monthEnds, valueAt } from './time';
import { miniDataset } from './testutil';
import { fmtDate, fmtDelta, fmtNumber, fmtPct } from '../lib/format';

const T = '2026-09-30';

describe('tid', () => {
  it('bevarer månedsultimo ved addMonths', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-09-30', -12)).toBe('2025-09-30');
    expect(addMonths('2024-02-29', 12)).toBe('2025-02-28');
  });
  it('finder seneste værdi på eller før datoen', () => {
    const tl = [
      { date: '2025-01-01', value: 1 },
      { date: '2026-01-01', value: 2 },
    ];
    expect(valueAt(tl, '2025-12-31')?.value).toBe(1);
    expect(valueAt(tl, '2026-01-01')?.value).toBe(2);
    expect(valueAt(tl, '2024-12-31')).toBeUndefined();
  });
  it('genererer 13 månedsultimoer for historikken', () => {
    expect(monthEnds(HISTORY_START, HISTORY_END)).toHaveLength(13);
  });
});

describe('dansk formatering', () => {
  it('bruger dansk tal- og datoformat', () => {
    expect(fmtNumber(1234.5, 1)).toBe('1.234,5');
    expect(fmtPct(0.456)).toBe('46 %');
    expect(fmtDate('2026-09-30')).toBe('30.09.2026');
    expect(fmtDelta(-3.4)).toBe('−3');
    expect(fmtDelta(0.2)).toBe('±0');
  });
});

describe('manglende data', () => {
  const item = (value: number | null, weight = 1) => ({ key: String(Math.random()), label: '', ref: null, weight, value, detail: '' });

  it('bliver aldrig til nul, men sænker datadækningen', () => {
    const r = aggregate('I1.1', [item(80, 1), item(null, 1)], { emptyIsMissing: false, emptyReason: '' });
    expect(r.value).toBe(80);
    expect(r.coverage).toBe(0.5);
  });
  it('kræver minimumsantal observationer', () => {
    const r = aggregate('I4.4', [item(100), item(0)], { minN: 3, emptyIsMissing: false, emptyReason: '' });
    expect(r.value).toBeNull();
    expect(r.applicable).toBe(true);
    expect(r.coverage).toBe(0);
  });
  it('skelner mellem manglende register og intet at måle', () => {
    expect(aggregate('I5.1', [], { emptyIsMissing: true, emptyReason: 'x' }).applicable).toBe(true);
    expect(aggregate('I5.3', [], { emptyIsMissing: false, emptyReason: 'x' }).applicable).toBe(false);
  });
});

describe('ORS – gennemregnet eksempel på kontrolleret datasæt', () => {
  const data = miniDataset();
  const a = createAnalysis(data, T);
  const ors = computeOrs(a, null, MODEL_V1_1);
  const dim = (id: string) => ors.dimensions.find((d) => d.id === id)!;

  it('beregner D1 som vægtet kapacitet og besættelse', () => {
    // I1.1 = (5×70 + 3×100) / 8 = 81,25 ; I1.2 = 100 ; D1 = 0,65×81,25 + 0,35×100
    expect(dim('D1').indicators[0]!.value).toBeCloseTo(81.25, 6);
    expect(dim('D1').score).toBeCloseTo(87.8125, 6);
  });
  it('beregner D2 fra backup, dokumentation og genetableringstid', () => {
    expect(dim('D2').indicators[0]!.value).toBeCloseTo(240 / 9, 6);
    expect(dim('D2').indicators[1]!.value).toBeCloseTo(575 / 9, 6);
    expect(dim('D2').indicators[2]!.value).toBeCloseTo(643.75 / 9, 6);
    expect(dim('D2').score).toBeCloseTo(0.45 * (240 / 9) + 0.3 * (575 / 9) + 0.25 * (643.75 / 9), 6);
  });
  it('tæller ikke samme efterfølger to gange (dobbeltbooking)', () => {
    // PX er kandidat til både RA (1–2 år) og RB (klar nu). Inden for 2 år tildeles PX til den mest kritiske rolle (RA).
    const i31 = dim('D3').indicators[0]!;
    expect(i31.value).toBeCloseTo(500 / 9, 6);
    expect(i31.coverage).toBeCloseTo(9 / 13, 6); // RC uden plan = manglende data, ikke nul
    expect(a.succession.roles.get('RB')!.lostToDoubleBooking2y).toBe(true);
    expect(a.succession.roles.get('RB')!.nominal2y).toBe(true);
  });
  it('viser utilstrækkeligt datagrundlag, når dækningen er for lav', () => {
    expect(dim('D5').score).toBeNull();
    expect(dim('D5').rawScore).toBe(100);
    expect(dim('D5').coverage).toBeCloseTo(0.25, 6);
    expect(dim('D5').status).toBe('utilstrækkelig');
  });
  it('beregner tilpasningsevne fra gab og milepæle', () => {
    expect(dim('D6').indicators[0]!.value).toBeCloseTo(100, 6); // 50 % af gabet lukket
    expect(dim('D6').indicators[1]!.value).toBeCloseTo(50, 6);
    expect(dim('D6').indicators[2]!.applicable).toBe(false);
    expect(dim('D6').score).toBeCloseTo(57.5 / 0.75, 6);
  });
  it('anvender svaghedsloftet i v1.1, men ikke i v1.0', () => {
    expect(dim('D4').score).toBe(0);
    const expectedMean = (0.2 * 87.8125 + 0.2 * dim('D2').score! + 0.2 * dim('D3').score! + 0.15 * 0 + 0.15 * (57.5 / 0.75)) / 0.9;
    expect(ors.weightedMean).toBeCloseTo(expectedMean, 6);
    expect(ors.cap).toBe(30);
    expect(ors.capApplied).toBe(true);
    expect(ors.score).toBe(30);
    const v10 = computeOrs(a, null, MODEL_V1_0);
    expect(v10.score).toBeCloseTo(expectedMean, 6);
    expect(v10.capApplied).toBe(false);
  });
  it('udelader D5 og genvægter, når 90 % af vægten har score', () => {
    expect(ors.weightCoverage).toBeCloseTo(0.9, 6);
  });
  it('beregner enhedsscorer på enhedens egne data', () => {
    const u2 = computeOrs(a, 'U2');
    expect(u2.dimensions[0]!.score).toBeCloseTo(100, 6);
    expect(u2.dimensions[1]!.score).toBeCloseTo(82, 6);
    expect(u2.dimensions[2]!.score).toBeNull(); // RC uden plan → ingen data
  });
  it('viser ingen ORS, når under 75 % af vægten har score', () => {
    const d = miniDataset();
    d.successionPlans = [];
    d.capabilities.forEach((c) => (c.capacity = []));
    const r = orsFor(d, T, null);
    expect(r.weightCoverage).toBeLessThan(0.75);
    expect(r.score).toBeNull();
    expect(r.status).toBe('utilstrækkelig');
  });
});

describe('statusgrænser', () => {
  it('afrunder før klassifikation', () => {
    expect(statusFor(74.5)).toBe('robust');
    expect(statusFor(74.4)).toBe('tilstrækkelig');
    expect(statusFor(60)).toBe('tilstrækkelig');
    expect(statusFor(59.49)).toBe('sårbar');
    expect(statusFor(45)).toBe('sårbar');
    expect(statusFor(44.4)).toBe('kritisk');
    expect(statusFor(null)).toBe('utilstrækkelig');
  });
});

describe('viden', () => {
  it('beregner genetableringstid ud fra backup og dokumentation', () => {
    expect(rebuildMonths(2, 18, 0)).toBe(2);
    expect(rebuildMonths(1, 18, 1)).toBeCloseTo(15.3, 6);
    expect(rebuildMonths(1, 10, 3)).toBeCloseTo(4.5, 6);
    expect(rebuildMonths(1, 10, null)).toBeNull();
    expect(rebuildScore(2)).toBe(100);
    expect(rebuildScore(18)).toBe(0);
    expect(rebuildScore(30)).toBe(0);
    expect(rebuildScore(10)).toBe(50);
  });
});

describe('succession – matching', () => {
  it('giver mere kritiske roller forrang og bruger forøgende stier', () => {
    const d = miniDataset();
    // Tilføj en ekstra kandidat til RB, så både RA og RB kan dækkes.
    d.persons.push({ id: 'PY', name: 'Kandidat Y', unitId: 'U1', title: '', employedFrom: '2020-01-01', employedTo: null });
    d.successionPlans[1]!.candidates.push({ personId: 'PY', from: '2024-01-01', to: null, developmentNeeds: [], assessments: [{ date: '2025-06-01', readiness: '1-2', basis: 'vurdering', assessorRoleId: 'RA', evidenceIds: [] }] });
    const m = matchSuccessors(createCtx(d, T), '2år');
    expect(m.get('RA')).toBe('PX');
    expect(m.get('RB')).toBe('PY');
  });
  it('udelukker fratrådte kandidater', () => {
    const d = miniDataset();
    d.persons.find((p) => p.id === 'PX')!.employedTo = '2026-06-30';
    const m = matchSuccessors(createCtx(d, T), '2år');
    expect(m.size).toBe(0);
  });
});

describe('risikomodel', () => {
  it('beregner prioritet og bånd efter formlen', () => {
    expect(priorityOf(5, 5, 1)).toBe(100);
    expect(priorityOf(4, 4, 2)).toBe(51);
    expect(priorityOf(1, 1, 5)).toBe(1);
    expect(bandOf(60)).toBe('kritisk');
    expect(bandOf(59)).toBe('høj');
    expect(bandOf(35)).toBe('høj');
    expect(bandOf(34)).toBe('moderat');
    expect(bandOf(15)).toBe('moderat');
    expect(bandOf(14)).toBe('lav');
  });
  it('udleder risici deterministisk fra data', () => {
    const risks = computeRisks(createAnalysis(miniDataset(), T));
    const byId = new Map(risks.map((r) => [r.id, r]));
    expect(byId.get('VID-KA')!.priority).toBe(80);
    expect(byId.get('KAP-CA')!.priority).toBe(48);
    expect(byId.get('SUC-RB')!.exposure.value).toBe(3); // dobbeltbooket kandidat
    expect(byId.get('SUC-RB')!.priority).toBe(24);
    expect(byId.get('SUC-RC')!.priority).toBe(38);
    // RA er dækket inden for 2 år, men ingen kan overtage nu → moderat nødberedskabsrisiko.
    expect(byId.get('SUC-RA')!.exposure.value).toBe(2);
    expect(byId.get('SUC-RA')!.title).toContain('Intet nødberedskab');
  });
  it('lader ikke sandsynlighed påvirke prioriteten', () => {
    const d = miniDataset();
    const base = computeRisks(createAnalysis(d, T)).find((r) => r.id === 'KAP-CA')!;
    d.assessments.push({ id: 'S1', kind: 'sandsynlighed', subjectType: 'risiko', subjectId: 'KAP-CA', value: 5, date: '2026-09-01', assessorRoleId: 'RA', basis: 'vurdering', rationale: '' });
    const withP = computeRisks(createAnalysis(d, T)).find((r) => r.id === 'KAP-CA')!;
    expect(withP.probability?.value).toBe(5);
    expect(withP.priority).toBe(base.priority);
  });
  it('tæller samme rod kun én gang i top-listen', () => {
    const risks = computeRisks(createAnalysis(demoDataset, T));
    const top = topDistinctRisks(risks, 3);
    expect(new Set(top.map((r) => r.rootKey)).size).toBe(3);
    for (const r of risks) for (const rel of r.relatedRiskIds) expect(risks.find((x) => x.id === rel)!.rootKey).toBe(r.rootKey);
  });
});

describe('rettelser efter uafhængig gennemgang', () => {
  it('lader tabt viden sænke robustheden i kritisk viden', () => {
    const r = runScenario(miniDataset(), [{ type: 'personUnavailable', personId: 'PA', promoteReadySuccessor: false }], T, null);
    expect(r.after.dimensions[1]!.score!).toBeLessThan(r.before.dimensions[1]!.score!);
  });
  it('lader ikke en ubesat lederrolle forbedre lederudvikling', () => {
    const r = runScenario(demoDataset, [{ type: 'personUnavailable', personId: 'P01', promoteReadySuccessor: false }], T, null);
    expect(r.after.dimensions[3]!.score!).toBeLessThanOrEqual(r.before.dimensions[3]!.score! + 1e-9);
  });
  it('fordeler efterfølgere efter dokumenteret prioritet ved lige kritikalitet', () => {
    const a = createAnalysis(demoDataset, T);
    // R05 og R06 har begge kritikalitet 5 og fremtidig betydning 5; R05 bidrager til målet med tidligst frist (M2, 2027).
    expect(a.succession.roles.get('R05')!.effective2y).toBe('P19');
    expect(a.succession.roles.get('R06')!.lostToDoubleBooking2y).toBe(true);
  });
  it('viser kun risikobehandlinger, der er registreret på datoen', () => {
    const early = computeRisks(createAnalysis(demoDataset, '2025-12-31'));
    expect(early.every((r) => r.treatment === null)).toBe(true);
    const late = computeRisks(createAnalysis(demoDataset, T));
    expect(late.some((r) => r.treatment !== null)).toBe(true);
  });
  it('udleder handlingers status på historiske datoer', async () => {
    const { actionStatusAt, actionVisibleAt } = await import('./actions');
    const a07 = demoDataset.actions.find((x) => x.id === 'A07')!;
    expect(actionVisibleAt(a07, '2026-01-31')).toBe(false);
    expect(actionStatusAt(a07, '2026-06-30')).toBe('igangsat');
    expect(actionStatusAt(a07, '2026-09-30')).toBe('forsinket');
    expect(actionStatusAt(a07, '2026-04-30')).toBe('planlagt');
  });
  it('tæller samme bærer kun én gang', () => {
    const d = structuredClone(demoDataset);
    const p = d.practices.find((x) => x.id === 'CP01')!;
    p.carriers.push({ personId: 'P07', from: '2026-01-01', to: null });
    const ctx = createCtx(d, T);
    expect(practiceCarriersAt(ctx, p).length).toBe(3);
  });
  it('tildeler risici for praksisser på tværs af enheder til alle enhederne', () => {
    const risks = computeRisks(createAnalysis(demoDataset, T));
    for (const r of risks) expect(r.unitIds).toContain(r.unitId);
  });
});

describe('scenarier', () => {
  it('ændrer aldrig grunddata', () => {
    const before = JSON.stringify(demoDataset);
    runScenario(demoDataset, changesFor(DEFAULT_PARAMS), T, null);
    applyChanges(demoDataset, [{ type: 'capabilityCapacity', capabilityId: 'C01', requiredDeltaFte: 5, currentDeltaFte: 0 }], T);
    expect(JSON.stringify(demoDataset)).toBe(before);
  });
  it('giver samme resultat som platformen uden ændringer', () => {
    const r = runScenario(demoDataset, [], T, null);
    expect(r.after.score).toBeCloseTo(r.before.score!, 10);
    expect(r.before.score).toBeCloseTo(orsFor(demoDataset, T, null).score!, 10);
  });
  it('fjerner rolle, viden og kapacitet ved tab af nøgleperson', () => {
    const r = runScenario(miniDataset(), [{ type: 'personUnavailable', personId: 'PA', promoteReadySuccessor: true }], T, null);
    expect(r.uncovered.map((u) => u.kind)).toEqual(expect.arrayContaining(['ubesat rolle', 'tabt viden']));
    expect(r.after.dimensions[0]!.score!).toBeLessThan(r.before.dimensions[0]!.score!);
    expect(r.rebuildMonths).toBe(12); // RA: 6 + 6 mdr., ingen kandidat klar nu
  });
  it('lader en klar efterfølger overtage og efterlade sin egen rolle ledig', () => {
    const d = miniDataset();
    d.successionPlans[0]!.candidates[0]!.assessments.push({ date: '2026-08-01', readiness: 'nu', basis: 'dokumenteret', assessorRoleId: 'RA', evidenceIds: [] });
    // PX overtager RA; PX har ingen rolle, så ingen kaskade, og RA forbliver besat.
    const r = runScenario(d, [{ type: 'personUnavailable', personId: 'PA', promoteReadySuccessor: true }], T, null);
    expect(r.uncovered.find((u) => u.kind === 'ubesat rolle')).toBeUndefined();
    expect(r.assumptions.join(' ')).toContain('overtager');
  });
  it('øger nødberedskabet, når en efterfølger bliver klar', () => {
    const r = runScenario(miniDataset(), [{ type: 'successorReady', roleId: 'RA', personId: 'PX', readiness: 'nu' }], T, null);
    const i32b = r.before.dimensions[2]!.indicators[1]!.value!;
    const i32a = r.after.dimensions[2]!.indicators[1]!.value!;
    expect(i32b).toBeCloseTo(400 / 9, 6);
    expect(i32a).toBeCloseTo(500 / 9, 6); // PX dækker nu RA (mest kritisk) i stedet for RB
  });
  it('forbedrer viden, når den dokumenteres og overføres', () => {
    const r = runScenario(miniDataset(), [{ type: 'knowledgeTransfer', knowledgeId: 'KA', documentationLevel: 2, addHolderId: 'PB' }], T, null);
    expect(r.after.dimensions[1]!.score!).toBeGreaterThan(r.before.dimensions[1]!.score!);
    expect(r.resolvedRisks.map((x) => x.id)).toContain('VID-KA');
  });
  it('udvider kapacitetsgabet, når behovet øges', () => {
    const r = runScenario(miniDataset(), [{ type: 'capabilityCapacity', capabilityId: 'CA', requiredDeltaFte: 4, currentDeltaFte: 0 }], T, null);
    expect(r.after.dimensions[0]!.indicators[0]!.value!).toBeLessThan(r.before.dimensions[0]!.indicators[0]!.value!);
  });
});

describe('demonstrationsdata', () => {
  it('består referentiel validering', () => {
    expect(validateDataset(demoDataset)).toEqual([]);
  });
  it('har 4–6 enheder, 20–30 roller, 8–12 kapabiliteter', () => {
    expect(demoDataset.units.length).toBeGreaterThanOrEqual(4);
    expect(demoDataset.units.length).toBeLessThanOrEqual(6);
    expect(demoDataset.roles.length).toBeGreaterThanOrEqual(20);
    expect(demoDataset.roles.length).toBeLessThanOrEqual(30);
    expect(demoDataset.capabilities.length).toBeGreaterThanOrEqual(8);
    expect(demoDataset.capabilities.length).toBeLessThanOrEqual(12);
  });
  it('har risikobehandlinger, der peger på beregnede risici', () => {
    const ids = new Set(computeRisks(createAnalysis(demoDataset, demoDataset.dataAsOf)).map((r) => r.id));
    for (const t of demoDataset.riskTreatments) expect(ids.has(t.riskId), t.riskId).toBe(true);
    for (const a of demoDataset.actions) for (const id of a.riskIds) expect(ids.has(id), `${a.id} → ${id}`).toBe(true);
  });
  it('fortæller en sammenhængende historie: robust produktion, sårbare vækstområder', () => {
    const prd = orsFor(demoDataset, T, 'PRD');
    const dig = orsFor(demoDataset, T, 'DIG');
    expect(prd.status).toBe('robust');
    expect(['sårbar', 'kritisk']).toContain(dig.status);
  });
  it('viser et kontrolleret datahul i Koncernfunktioner (ingen praksisdata)', () => {
    const kon = orsFor(demoDataset, T, 'KON');
    expect(kon.dimensions.find((d) => d.id === 'D5')!.score).toBeNull();
    expect(kon.score).not.toBeNull();
  });
});

describe('historik og modelversioner', () => {
  const h = computeHistory(demoDataset, null, HISTORY_START, HISTORY_END);
  it('har mindst 12 måneders historik', () => {
    expect(h.snapshots.length).toBeGreaterThanOrEqual(13);
  });
  it('markerer modelskift og ændret datagrundlag', () => {
    expect(h.events.some((e) => e.kind === 'model' && e.date === MODEL_V1_1.validFrom)).toBe(true);
    expect(h.events.some((e) => e.kind === 'datagrundlag' && e.date === '2026-02-28')).toBe(true);
  });
  it('rapporterer med den model, der var gældende', () => {
    for (const s of h.snapshots) expect(s.modelVersionAtTime).toBe(modelAt(s.date).version);
    const last = h.snapshots[h.snapshots.length - 1]!;
    expect(last.current.score).toBeCloseTo(orsFor(demoDataset, T, null).score!, 10);
    expect(last.modelVersionAtTime).toBe(CURRENT_MODEL.version);
  });
});

describe('sammenhæng mellem moduler', () => {
  const a = createAnalysis(demoDataset, T);
  const ors = computeOrs(a, null);
  it('genberegner dimensioner fra indikatorer', () => {
    for (const d of ors.dimensions) {
      const valued = d.indicators.filter((i) => i.value !== null);
      const w = valued.reduce((s, i) => s + CURRENT_MODEL.indicatorWeights[i.id], 0);
      const raw = valued.reduce((s, i) => s + CURRENT_MODEL.indicatorWeights[i.id] * i.value!, 0) / w;
      expect(d.rawScore).toBeCloseTo(raw, 10);
    }
  });
  it('genberegner risikoprioriteter fra faktorerne', () => {
    for (const r of computeRisks(a)) expect(r.priority).toBe(priorityOf(r.consequence.value, r.exposure.value, r.readiness.value));
  });
  it('har enkeltpersonsafhængigheder, der også optræder som risici', () => {
    const risks = computeRisks(a);
    for (const p of singlePersonDependencies(computeFindings(a), null)) {
      expect(risks.some((r) => r.rootKey === `person:${p}`), p).toBe(true);
    }
  });
  it('anvender svaghedsloft i matrixens beredskab', () => {
    expect(readinessOf([100, 100, 20])).toBe(50);
    expect(readinessOf([null, 80])).toBe(80);
    const pts = capabilityPoints(a, null);
    expect(new Set(pts.map((p) => p.quadrant))).toEqual(new Set(['opbyg', 'succession', 'beskyt', 'fasthold', 'omstil']));
  });
});
