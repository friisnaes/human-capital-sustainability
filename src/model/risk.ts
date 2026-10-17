/**
 * Human Capital Risk Dashboard™ – forklarlig risikomodel (v1.0).
 *
 * Risici udledes deterministisk af grunddata. Hver risiko vurderes på tre
 * adskilte faktorer (1–5):
 *   K  Konsekvens   – hvor meget strategien rammes, hvis risikoen indtræffer
 *   E  Eksponering  – hvor koncentreret og svært erstattelig sårbarheden er
 *   B  Beredskab    – hvilke afværgeforanstaltninger der allerede virker
 * Prioritet = 100 × K × E × (6 − B) / 125 (0–100).
 *
 * En eventuel vurderet sandsynlighed vises separat og indgår IKKE i
 * prioriteten: modellen estimerer ikke individuel afgang, men hvor sårbar
 * organisationen er, hvis hændelsen indtræffer.
 *
 * Dobbelttælling: Samme person kan stå bag flere risici (fx både rolle og
 * viden). Risici med samme rod markeres som relaterede, og i overblik og
 * optællinger tælles hver rod kun én gang.
 */
import type { Assessment, Id, ISODate, RiskCategory, RiskTreatment, Role } from '../domain/types';
import { CRITICALITY, NORMALIZATION, RISK_MODEL, WINDOWS } from './config';
import {
  capacityAt,
  type Ctx,
  futureImportance,
  personName,
  practiceCarriersAt,
  practiceOwnerFilled,
  roleHolder,
  roleTitle,
} from './context';
import type { Analysis } from './ors';
import { addMonths, monthsBetween, overlaps, valueAt } from './time';
import { fmtDate, fmtNumber, fmtPct } from '../lib/format';

export type Band = 'kritisk' | 'høj' | 'moderat' | 'lav';

export interface Factor {
  value: number;
  explanation: string[];
}

export interface RiskEvidence {
  label: string;
  source: string;
  date: ISODate | null;
  basis: 'dokumenteret' | 'vurdering' | 'registerdata';
}

export interface Risk {
  id: Id;
  category: RiskCategory;
  title: string;
  subject: { type: 'rolle' | 'viden' | 'kapabilitet' | 'praksis'; id: Id };
  unitId: Id;
  /** Alle enheder, risikoen vedrører (praksisser kan gå på tværs af enheder). */
  unitIds: Id[];
  rootKey: string;
  rootLabel: string;
  goalIds: Id[];
  capabilityIds: Id[];
  roleIds: Id[];
  knowledgeIds: Id[];
  consequence: Factor;
  exposure: Factor;
  readiness: Factor;
  probability: Assessment | null;
  priority: number;
  band: Band;
  horizon: { label: string; months: number | null; milestone: string | null };
  businessConsequence: string;
  evidence: RiskEvidence[];
  dataQuality: { level: 'høj' | 'middel' | 'lav'; notes: string[] };
  treatment: RiskTreatment | null;
  suggestedOwnerRoleId: Id;
  recommendation: string;
  relatedRiskIds: Id[];
}

export function priorityOf(k: number, e: number, b: number): number {
  return Math.round((100 * k * e * (6 - b)) / 125);
}

export function bandOf(priority: number): Band {
  if (priority >= RISK_MODEL.bands.kritisk) return 'kritisk';
  if (priority >= RISK_MODEL.bands.høj) return 'høj';
  if (priority >= RISK_MODEL.bands.moderat) return 'moderat';
  return 'lav';
}

const clamp5 = (n: number) => Math.max(1, Math.min(5, Math.round(n)));

/** Øverste ansvarlige rolle i en enhed (direktionsmedlem). */
export function unitHeadRoleId(ctx: Ctx, unitId: Id): Id {
  const heads = ctx.data.roles
    .filter((r) => r.unitId === unitId && r.kind === 'direktion')
    .sort((a, b) => b.criticality - a.criticality || a.id.localeCompare(b.id));
  return heads[0]?.id ?? 'R01';
}

/** Højeste vurderede fremtidige betydning – null, hvis ingen af kapabiliteterne er vurderet. */
function maxFutureImportance(ctx: Ctx, capabilityIds: Id[]): number | null {
  const v = capabilityIds.map((c) => futureImportance(ctx, c)).filter((x): x is NonNullable<typeof x> => x !== null);
  return v.length ? Math.max(...v) : null;
}

/** Konsekvens = (kritikalitet + fremtidig betydning) / 2; uden vurdering bruges kritikaliteten alene og det markeres. */
function consequenceOf(criticality: number, fi: number | null, label: string): Factor {
  if (fi === null) {
    return { value: clamp5(criticality), explanation: [`${label} ${criticality}. Fremtidig betydning er ikke vurderet, så konsekvensen bygger alene på kritikaliteten.`] };
  }
  const v = clamp5((criticality + fi) / 2);
  return { value: v, explanation: [`${label} ${criticality}, højeste fremtidige betydning af tilknyttede kapabiliteter ${fi}: (${criticality} + ${fi}) / 2 afrundet = ${v}.`] };
}

function goalsOf(ctx: Ctx, capabilityIds: Id[]): Id[] {
  const set = new Set<Id>();
  for (const cid of capabilityIds) for (const g of ctx.capabilityById.get(cid)?.goalIds ?? []) set.add(g);
  return [...set].sort();
}

function horizonFor(ctx: Ctx, goalIds: Id[]): Risk['horizon'] {
  let next: { date: ISODate; title: string; code: string } | null = null;
  for (const g of ctx.data.goals) {
    if (!goalIds.includes(g.id)) continue;
    for (const m of g.milestones) {
      if (m.completed && m.completed <= ctx.asOf) continue;
      if (!next || m.planned < next.date) next = { date: m.planned, title: m.title, code: g.code };
    }
  }
  if (!next) return { label: 'Lang sigt (over 18 mdr.)', months: null, milestone: null };
  const months = Math.max(0, monthsBetween(ctx.asOf, next.date));
  const label =
    months <= RISK_MODEL.horizonMonths.kort
      ? 'Kort sigt (0–6 mdr.)'
      : months <= RISK_MODEL.horizonMonths.mellem
        ? 'Mellemlang sigt (6–18 mdr.)'
        : 'Lang sigt (over 18 mdr.)';
  const overdue = next.date < ctx.asOf ? ' (overskredet)' : '';
  return { label, months, milestone: `${next.code}: ${next.title} – planlagt ${fmtDate(next.date)}${overdue}` };
}

function probabilityFor(ctx: Ctx, riskId: Id): Assessment | null {
  let best: Assessment | null = null;
  for (const a of ctx.data.assessments) {
    if (a.kind === 'sandsynlighed' && a.subjectId === riskId && a.date <= ctx.asOf && (!best || a.date >= best.date)) best = a;
  }
  return best;
}

function goalCodes(ctx: Ctx, ids: Id[]): string {
  return ids.map((id) => ctx.data.goals.find((g) => g.id === id)?.code ?? id).join(', ') || 'ingen mål';
}

// ------------------------------------------------------------ Succession

function successionRisk(a: Analysis, role: Role): Omit<Risk, 'treatment' | 'relatedRiskIds' | 'probability' | 'priority' | 'band'> | null {
  const { ctx } = a;
  const s = a.succession.roles.get(role.id);
  if (!s) return null;
  const holder = roleHolder(ctx, role.id);
  const vacant = !holder;
  if (!vacant && s.hasPlan && s.effective2y && s.effectiveNow) return null;
  // Kun nødberedskab mangler: efterfølger er klar inden for 2 år, men ingen kan overtage nu.
  const emergencyOnly = !vacant && s.hasPlan && !!s.effective2y && !s.effectiveNow;

  const exposure: Factor = { value: 0, explanation: [] };
  if (emergencyOnly) {
    exposure.value = 2;
    exposure.explanation.push(`${personName(ctx, s.effective2y)} forventes klar inden for 1–2 år, men ingen kan overtage rollen nu.`);
  } else if (vacant) {
    exposure.value = 5;
    exposure.explanation.push('Rollen er ubesat.');
  } else if (!s.hasPlan) {
    exposure.value = 4;
    exposure.explanation.push('Ingen registreret successionsplan – dækningen er ukendt.');
  } else if (s.candidates.length === 0) {
    exposure.value = 5;
    exposure.explanation.push('Successionsplanen har ingen kandidater.');
  } else if (s.lostToDoubleBooking2y) {
    exposure.value = 3;
    exposure.explanation.push('Kandidaten er også planlagt til en rolle, der prioriteres højere i fordelingen, og kan ikke dække begge behov samtidig.');
  } else {
    exposure.value = 4;
    exposure.explanation.push('Kandidaterne er tidligst klar om 3–5 år.');
  }
  const rebuild = role.recruitMonths + role.rampUpMonths;
  exposure.explanation.push(`Genetablering ved ekstern rekruttering: ca. ${rebuild} mdr. (${role.recruitMonths} rekruttering + ${role.rampUpMonths} indkøring).`);

  const fi = maxFutureImportance(ctx, role.capabilityIds);
  const consequence = consequenceOf(role.criticality, fi, 'Rollens kritikalitet');

  let b = 1;
  const readiness: Factor = { value: 1, explanation: ['Udgangspunkt 1.'] };
  if (s.nominalNow) {
    b += 1;
    readiness.explanation.push('+1: der findes en kandidat, der kan fungere nu (midlertidig dækning).');
  }
  const holderKnowledge = holder ? [...a.knowledge.values()].filter((k) => k.qualified.some((h) => h.personId === holder.id)) : [];
  if (holderKnowledge.length > 0 && holderKnowledge.every((k) => (k.docLevel ?? 0) >= 2)) {
    b += 1;
    readiness.explanation.push('+1: rolleindehaverens kritiske viden er dækkende dokumenteret.');
  }
  if (holderKnowledge.length > 0 && holderKnowledge.every((k) => k.qualified.length >= 2)) {
    b += 1;
    readiness.explanation.push('+1: rolleindehaverens kritiske viden deles med mindst én anden.');
  }
  const developing = s.candidates.some((c) =>
    ctx.data.evidence.some(
      (e) => e.personId === c.personId && (e.type === 'udviklingsforløb' || e.type === 'uddelegeret-ansvar') && e.date <= ctx.asOf && overlaps(e.date, e.endDate, addMonths(ctx.asOf, -WINDOWS.evidenceMonths), ctx.asOf),
    ),
  );
  if (developing) {
    b += 1;
    readiness.explanation.push('+1: mindst én kandidat er i dokumenteret udvikling.');
  }
  readiness.value = clamp5(b);
  if (readiness.explanation.length === 1) readiness.explanation.push('Ingen virksomme afværgeforanstaltninger registreret.');

  const goalIds = goalsOf(ctx, role.capabilityIds);
  const evidence: RiskEvidence[] = [];
  const notes: string[] = [];
  if (s.hasPlan) {
    evidence.push({ label: `Successionsplan, seneste review ${fmtDate(s.lastReview)}`, source: `Ejer: ${roleTitle(ctx, ctx.planByRole.get(role.id)?.ownerRoleId)}`, date: s.lastReview, basis: 'registerdata' });
    for (const c of s.candidates) {
      evidence.push({
        label: `${personName(ctx, c.personId)}: ${c.readiness === 'nu' ? 'klar nu' : c.readiness === '1-2' ? '1–2 år' : '3–5 år'}`,
        source: `Vurderet af ${roleTitle(ctx, c.assessorRoleId)}`,
        date: c.assessedOn,
        basis: c.basis ?? 'vurdering',
      });
    }
    if (s.lastReview && s.lastReview < addMonths(ctx.asOf, -WINDOWS.planReviewMaxAgeMonths)) notes.push('Successionsplanen er ikke reviewet inden for 13 måneder.');
    if (s.candidates.some((c) => c.basis === 'vurdering')) notes.push('Mindst én beredskabsvurdering hviler på menneskelig vurdering uden dokumenteret evidens.');
  } else {
    notes.push('Ingen successionsplan registreret.');
  }
  if (fi === null) notes.push('Fremtidig betydning af rollens kapabiliteter er ikke vurderet.');
  const level: 'høj' | 'middel' | 'lav' = !s.hasPlan || fi === null ? 'lav' : notes.length === 0 ? 'høj' : 'middel';

  const holderText = holder ? holder.name : 'ingen (ubesat)';
  return {
    id: `SUC-${role.id}`,
    category: 'succession',
    title: vacant ? `${role.title} er ubesat` : emergencyOnly ? `Intet nødberedskab: ${role.title}` : `Successionsgab: ${role.title}`,
    subject: { type: 'rolle', id: role.id },
    unitId: role.unitId,
    unitIds: [role.unitId],
    rootKey: holder ? `person:${holder.id}` : `rolle:${role.id}`,
    rootLabel: holder ? holder.name : role.title,
    goalIds,
    capabilityIds: role.capabilityIds,
    roleIds: [role.id],
    knowledgeIds: holderKnowledge.map((k) => k.id),
    consequence,
    exposure: { ...exposure, value: clamp5(exposure.value) },
    readiness,
    horizon: horizonFor(ctx, goalIds),
    businessConsequence: emergencyOnly
      ? `Rolleindehaver: ${holderText}. Bliver rollen ledig i morgen, skal den dækkes midlertidigt, indtil efterfølgeren er klar; ${goalCodes(ctx, goalIds)} har i mellemtiden ingen fuldt ansvarlig leder.`
      : `Rolleindehaver: ${holderText}. Bliver rollen ledig, mangler ${goalCodes(ctx, goalIds)} ansvarlig ledelse i op til ca. ${rebuild} mdr., fordi ingen efterfølger effektivt er klar inden for to år.`,
    evidence,
    dataQuality: { level, notes },
    suggestedOwnerRoleId: ctx.planByRole.get(role.id)?.ownerRoleId ?? unitHeadRoleId(ctx, role.unitId),
    recommendation: emergencyOnly
      ? 'Aftal en midlertidig dækning (konstitution), og beskriv rollens vigtigste beslutninger, så overgangen kan ske uden tab af fremdrift.'
      : !s.hasPlan
      ? 'Registrér en successionsplan med mindst to kandidater og dokumenteret beredskab.'
      : s.lostToDoubleBooking2y
        ? 'Udpeg en yderligere kandidat, så samme person ikke skal dække to kritiske roller.'
        : 'Udpeg mindst én kandidat med realistisk beredskab inden for to år, og start et dokumenteret udviklingsforløb med uddelegeret ansvar.',
  };
}

// ------------------------------------------------------------ Viden

function knowledgeRisk(a: Analysis, kid: Id): Omit<Risk, 'treatment' | 'relatedRiskIds' | 'probability' | 'priority' | 'band'> | null {
  const { ctx } = a;
  const kv = a.knowledge.get(kid);
  if (!kv || kv.area.criticality < CRITICALITY.criticalKnowledge || kv.qualified.length >= 2) return null;
  const k = kv.area;
  const holder = kv.qualified[0];
  const exposure: Factor = { value: 0, explanation: [] };
  if (kv.lost) {
    exposure.value = 5;
    exposure.explanation.push('Ingen kvalificerede vidensholdere tilbage.');
  } else {
    const base = k.baseRebuildMonths;
    exposure.value = base >= 12 ? 5 : base >= 6 ? 4 : 3;
    exposure.explanation.push(`Kun én kvalificeret holder (${personName(ctx, holder?.personId)}).`);
    exposure.explanation.push(`Opbygning fra bunden tager ca. ${base} mdr. (≥ 12 mdr. = 5, 6–11 = 4, under 6 = 3).`);
  }
  const fi = maxFutureImportance(ctx, k.capabilityIds);
  const consequence = consequenceOf(k.criticality, fi, 'Vidensområdets kritikalitet');
  let b = 1 + (kv.docLevel ?? 0);
  const readiness: Factor = {
    value: 0,
    explanation: ['Udgangspunkt 1.', kv.docLevel === null ? 'Dokumentationsniveau er ikke vurderet og giver derfor intet tillæg.' : `+${kv.docLevel}: dokumentationsniveau ${kv.docLevel} af 3.`],
  };
  if (kv.trainees.length > 0) {
    b += 1;
    readiness.explanation.push(`+1: ${kv.trainees.map((t) => personName(ctx, t.personId)).join(', ')} under oplæring.`);
  }
  readiness.value = clamp5(b);
  const goalIds = goalsOf(ctx, k.capabilityIds);
  const notes: string[] = [];
  if (kv.docAssessed && kv.docAssessed < addMonths(ctx.asOf, -WINDOWS.docAssessmentMaxAgeMonths)) notes.push(`Dokumentationsniveauet er senest vurderet ${fmtDate(kv.docAssessed)} og bør genvurderes.`);
  if (kv.docLevel === null) notes.push('Dokumentationsniveau er ikke vurderet.');
  if (fi === null) notes.push('Fremtidig betydning af kapabiliteterne er ikke vurderet.');
  const caps = k.capabilityIds.map((c) => ctx.capabilityById.get(c)?.name ?? c).join(', ');
  return {
    id: `VID-${k.id}`,
    category: 'videnskoncentration',
    title: `Videnskoncentration: ${k.name}`,
    subject: { type: 'viden', id: k.id },
    unitId: k.unitId,
    unitIds: [k.unitId],
    rootKey: holder ? `person:${holder.personId}` : `viden:${k.id}`,
    rootLabel: holder ? personName(ctx, holder.personId) : k.name,
    goalIds,
    capabilityIds: k.capabilityIds,
    roleIds: holder ? ctx.data.assignments.filter((x) => x.personId === holder.personId && (x.end === null || x.end >= ctx.asOf) && x.start <= ctx.asOf).map((x) => x.roleId) : [],
    knowledgeIds: [k.id],
    consequence,
    exposure: { ...exposure, value: clamp5(exposure.value) },
    readiness,
    horizon: horizonFor(ctx, goalIds),
    businessConsequence: `Mistes ${holder ? personName(ctx, holder.personId) : 'den sidste holder'}, svækkes ${caps} i ca. ${fmtNumber(kv.rebuildMonths ?? k.baseRebuildMonths, 0)} mdr. med direkte betydning for ${goalCodes(ctx, goalIds)}.`,
    evidence: [
      { label: `Vidensholdere: ${kv.qualified.map((h) => `${personName(ctx, h.personId)} (${h.level})`).join(', ') || 'ingen'}`, source: 'Vidensregister', date: ctx.asOf, basis: 'registerdata' },
      { label: `Dokumentationsniveau ${kv.docLevel ?? '—'} af 3`, source: 'Vidensregister: dokumentationsvurdering', date: kv.docAssessed, basis: 'vurdering' },
      ...ctx.data.evidence
        .filter((e) => e.knowledgeId === k.id && e.date <= ctx.asOf)
        .map((e) => ({ label: e.title, source: e.source, date: e.date, basis: 'dokumenteret' as const })),
    ],
    dataQuality: { level: kv.docLevel === null || fi === null ? 'lav' : notes.length === 0 ? 'høj' : 'middel', notes },
    suggestedOwnerRoleId: unitHeadRoleId(ctx, k.unitId),
    recommendation:
      kv.trainees.length > 0
        ? 'Gør oplæringen færdig med en tydelig slutdato, og løft dokumentationen til mindst niveau 2.'
        : 'Udpeg en backup-holder, start struktureret videnoverdragelse, og løft dokumentationen til mindst niveau 2.',
  };
}

// ------------------------------------------------------------ Kapacitet

function capacityRisk(a: Analysis, cid: Id): Omit<Risk, 'treatment' | 'relatedRiskIds' | 'probability' | 'priority' | 'band'> | null {
  const { ctx } = a;
  const c = ctx.capabilityById.get(cid);
  if (!c) return null;
  const fi = futureImportance(ctx, cid);
  if (fi === null || fi < CRITICALITY.strategicCapability) return null;
  const cp = capacityAt(c, ctx.asOf, NORMALIZATION.capacityMaxAgeMonths);
  if (!cp || cp.required <= 0) return null;
  const cov = cp.current / cp.required;
  if (cov >= 0.8) return null;
  const e = cov < 0.5 ? 5 : cov < 0.65 ? 4 : 3;
  const prev = capacityAt(c, addMonths(ctx.asOf, -12), NORMALIZATION.capacityMaxAgeMonths);
  const gapNow = cp.required - cp.current;
  const gapPrev = prev ? prev.required - prev.current : null;
  const builders = new Set(
    ctx.data.evidence
      .filter((ev) => ev.capabilityId === cid && (ev.type === 'omstillingsforløb' || ev.type === 'udviklingsforløb') && ev.date <= ctx.asOf && overlaps(ev.date, ev.endDate, addMonths(ctx.asOf, -12), ctx.asOf))
      .map((ev) => ev.personId)
      .filter((p): p is Id => !!p),
  );
  let b = 1;
  const readiness: Factor = { value: 1, explanation: ['Udgangspunkt 1.'] };
  const add = Math.min(2, builders.size);
  if (add > 0) {
    b += add;
    readiness.explanation.push(`+${add}: ${builders.size} person(er) i dokumenteret omstillings- eller udviklingsforløb mod kapabiliteten.`);
  }
  if (gapPrev !== null && gapPrev > 0 && (gapPrev - gapNow) / gapPrev >= 0.25) {
    b += 1;
    readiness.explanation.push('+1: gabet er reduceret med mindst 25 % de seneste 12 mdr.');
  }
  readiness.value = clamp5(b);
  if (readiness.explanation.length === 1) readiness.explanation.push('Ingen dokumenteret kapacitetsopbygning.');
  const goalIds = [...c.goalIds].sort();
  return {
    id: `KAP-${c.id}`,
    category: 'kapacitetsgab',
    title: `Kapacitetsgab: ${c.name}`,
    subject: { type: 'kapabilitet', id: c.id },
    unitId: c.unitId,
    unitIds: [c.unitId],
    rootKey: `kapabilitet:${c.id}`,
    rootLabel: c.name,
    goalIds,
    capabilityIds: [c.id],
    roleIds: ctx.data.roles.filter((r) => r.capabilityIds.includes(c.id)).map((r) => r.id),
    knowledgeIds: ctx.data.knowledge.filter((k) => k.capabilityIds.includes(c.id)).map((k) => k.id),
    consequence: { value: fi, explanation: [`Direktionens vurdering af fremtidig betydning: ${fi}.`] },
    exposure: {
      value: e,
      explanation: [
        `${fmtNumber(cp.current, 1)} af ${fmtNumber(cp.required, 1)} årsværk = ${fmtPct(cov)} dækning (under 50 % = 5, under 65 % = 4, under 80 % = 3).`,
        gapPrev !== null ? `Gabet var ${fmtNumber(gapPrev, 1)} årsværk for 12 mdr. siden og er nu ${fmtNumber(gapNow, 1)}.` : 'Ingen sammenligning 12 mdr. tilbage.',
      ],
    },
    readiness,
    horizon: horizonFor(ctx, goalIds),
    businessConsequence: `${c.name} har ${fmtPct(cov)} af den kapacitet, ${goalCodes(ctx, goalIds)} kræver. Det manglende ${fmtNumber(gapNow, 1)} årsværk forsinker de milepæle, der afhænger af kapabiliteten.`,
    evidence: [
      { label: `Kapacitet ${fmtNumber(cp.current, 1)} / ${fmtNumber(cp.required, 1)} årsværk`, source: c.capacitySource, date: valueAt(c.capacity, ctx.asOf)?.date ?? null, basis: 'registerdata' },
      { label: `Fremtidig betydning ${fi} af 5`, source: 'Direktionens strategiseminar', date: null, basis: 'vurdering' },
    ],
    dataQuality: { level: 'middel', notes: ['Krævet kapacitet bygger på ressourceplanens antagelser og bør afstemmes ved næste budgetrevision.'] },
    suggestedOwnerRoleId: unitHeadRoleId(ctx, c.unitId),
    recommendation: 'Kombinér målrettet rekruttering med intern omstilling, og følg kapacitetsdækningen kvartalsvis.',
  };
}

// ------------------------------------------------------------ Kultur

function cultureRisk(a: Analysis, pid: Id): Omit<Risk, 'treatment' | 'relatedRiskIds' | 'probability' | 'priority' | 'band'> | null {
  const { ctx } = a;
  const p = ctx.data.practices.find((x) => x.id === pid);
  if (!p || p.registered > ctx.asOf || p.importance < 4) return null;
  const carriers = practiceCarriersAt(ctx, p);
  if (carriers.length >= 2) return null;
  const documented = valueAt(p.documented, ctx.asOf)?.value ?? false;
  const owner = practiceOwnerFilled(ctx, p);
  const adherence = valueAt(p.adherence, ctx.asOf);
  let b = 1;
  const readiness: Factor = { value: 1, explanation: ['Udgangspunkt 1.'] };
  if (documented) {
    b += 1;
    readiness.explanation.push('+1: praksis er beskrevet.');
  }
  if (owner) {
    b += 1;
    readiness.explanation.push('+1: praksis har en formel ejerrolle.');
  }
  if (adherence && adherence.value >= 0.8) {
    b += 1;
    readiness.explanation.push('+1: praksis gennemføres som planlagt (mindst 80 %).');
  }
  readiness.value = clamp5(b);
  if (readiness.explanation.length === 1) readiness.explanation.push('Hverken beskrevet, ejet eller stabilt gennemført.');
  const carrier = carriers[0];
  const unitId = p.unitIds[0] ?? 'KON';
  const capIds = ctx.data.capabilities.filter((c) => p.unitIds.includes(c.unitId)).map((c) => c.id);
  const goalIds = goalsOf(ctx, capIds);
  return {
    id: `KUL-${p.id}`,
    category: 'kulturbærer',
    title: `Personbåret praksis: ${p.name}`,
    subject: { type: 'praksis', id: p.id },
    unitId,
    unitIds: p.unitIds,
    rootKey: carrier ? `person:${carrier.personId}` : `praksis:${p.id}`,
    rootLabel: carrier ? personName(ctx, carrier.personId) : p.name,
    goalIds,
    capabilityIds: capIds,
    roleIds: p.ownerRoleId ? [p.ownerRoleId] : [],
    knowledgeIds: [],
    consequence: {
      value: Math.max(1, p.importance - 1),
      explanation: [
        `Praksissens betydning i praksisregistret er ${p.importance}.`,
        'En praksis påvirker strategien indirekte, så konsekvensen sættes ét trin under betydningen.',
      ],
    },
    exposure: {
      value: carrier ? 4 : 5,
      explanation: [carrier ? `Praksis bæres alene af ${personName(ctx, carrier.personId)} (én bærer = 4).` : 'Praksis har ingen aktive bærere (= 5).'],
    },
    readiness,
    horizon: horizonFor(ctx, goalIds),
    businessConsequence: `${p.name} risikerer at ophøre ved fravær af ${carrier ? personName(ctx, carrier.personId) : 'bæreren'}. ${p.description}`,
    evidence: [
      { label: `${carriers.length} aktiv bærer · ${documented ? 'beskrevet' : 'ikke beskrevet'} · ${owner ? 'formel ejer' : 'ingen formel ejer'}`, source: 'Praksisregister', date: p.registered, basis: 'registerdata' },
      ...(adherence ? [{ label: `${fmtPct(adherence.value)} af planlagte gennemførelser afholdt`, source: 'Mødekalendere (aggregeret)', date: adherence.date, basis: 'registerdata' as const }] : []),
    ],
    dataQuality: { level: 'middel', notes: ['Praksisregistret er etableret i februar 2026; historikken er kort.'] },
    suggestedOwnerRoleId: unitHeadRoleId(ctx, unitId),
    recommendation: 'Giv praksis en formel ejerrolle, beskriv den kort, og lad mindst to personer facilitere den på skift.',
  };
}

/** Alle risici på analysedatoen, sorteret efter prioritet (højest først). */
export function computeRisks(a: Analysis): Risk[] {
  const { ctx } = a;
  const raw = [
    ...ctx.data.roles.filter((r) => r.criticality >= CRITICALITY.criticalRole).map((r) => successionRisk(a, r)),
    ...ctx.data.knowledge.map((k) => knowledgeRisk(a, k.id)),
    ...ctx.data.capabilities.map((c) => capacityRisk(a, c.id)),
    ...ctx.data.practices.map((p) => cultureRisk(a, p.id)),
  ].filter((r): r is NonNullable<typeof r> => r !== null);

  const risks: Risk[] = raw.map((r) => {
    const priority = priorityOf(r.consequence.value, r.exposure.value, r.readiness.value);
    return {
      ...r,
      probability: probabilityFor(ctx, r.id),
      priority,
      band: bandOf(priority),
      treatment: ctx.data.riskTreatments.find((t) => t.riskId === r.id && t.registered <= ctx.asOf) ?? null,
      relatedRiskIds: [],
    };
  });
  for (const r of risks) {
    r.relatedRiskIds = risks.filter((o) => o.id !== r.id && o.rootKey === r.rootKey).map((o) => o.id);
  }
  return risks.sort(compareRisks);
}

const CATEGORY_RANK: Record<RiskCategory, number> = { videnskoncentration: 0, succession: 1, kapacitetsgab: 2, kulturbærer: 3 };

/** Sortering: prioritet, derefter konsekvens, eksponering, kategori og id. */
export function compareRisks(x: Risk, y: Risk): number {
  return (
    y.priority - x.priority ||
    y.consequence.value - x.consequence.value ||
    y.exposure.value - x.exposure.value ||
    CATEGORY_RANK[x.category] - CATEGORY_RANK[y.category] ||
    x.id.localeCompare(y.id)
  );
}

/** De n højest prioriterede risici med forskellig rod (ingen dobbelttælling). */
export function topDistinctRisks(risks: Risk[], n: number): Risk[] {
  const seen = new Set<string>();
  const out: Risk[] = [];
  for (const r of risks) {
    if (seen.has(r.rootKey)) continue;
    seen.add(r.rootKey);
    out.push(r);
    if (out.length === n) break;
  }
  return out;
}

export function risksInScope(risks: Risk[], scope: Id | null): Risk[] {
  return scope === null ? risks : risks.filter((r) => riskInScope(r, scope));
}

export function riskInScope(r: Risk, scope: Id | null): boolean {
  return scope === null || r.unitIds.includes(scope);
}

export const CATEGORY_LABEL: Record<RiskCategory, string> = {
  succession: 'Successionsgab',
  videnskoncentration: 'Videnskoncentration',
  kapacitetsgab: 'Kapacitetsgab',
  kulturbærer: 'Kulturbærerafhængighed',
};

export const BAND_LABEL: Record<Band, string> = {
  kritisk: 'Kritisk',
  høj: 'Høj',
  moderat: 'Moderat',
  lav: 'Lav',
};
