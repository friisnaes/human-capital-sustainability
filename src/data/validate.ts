/**
 * Validering af datagrundlaget: referentiel integritet, gyldige intervaller
 * og datoer. Køres i test og ved indlæsning i applikationen.
 */
import type { Dataset, ISODate } from '../domain/types';

export interface ValidationIssue {
  entity: string;
  id: string;
  message: string;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function validateDataset(d: Dataset): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (entity: string, id: string, message: string) => issues.push({ entity, id, message });
  const ids = (xs: { id: string }[]) => new Set(xs.map((x) => x.id));
  const units = ids(d.units);
  const goals = ids(d.goals);
  const caps = ids(d.capabilities);
  const roles = ids(d.roles);
  const persons = ids(d.persons);
  const knowledge = ids(d.knowledge);
  const evidence = ids(d.evidence);
  const actions = ids(d.actions);
  const personById = new Map(d.persons.map((p) => [p.id, p]));

  const date = (entity: string, id: string, v: ISODate | null) => {
    if (v !== null && !ISO.test(v)) add(entity, id, `Ugyldig dato: ${v}`);
  };
  const period = (entity: string, id: string, from: ISODate, to: ISODate | null) => {
    date(entity, id, from);
    date(entity, id, to);
    if (to !== null && to < from) add(entity, id, `Slutdato ${to} ligger før startdato ${from}`);
  };
  const unique = (entity: string, xs: { id: string }[]) => {
    const seen = new Set<string>();
    for (const x of xs) {
      if (seen.has(x.id)) add(entity, x.id, 'Dubleret id');
      seen.add(x.id);
    }
  };

  for (const [name, xs] of [
    ['enhed', d.units], ['mål', d.goals], ['kapabilitet', d.capabilities], ['rolle', d.roles], ['person', d.persons],
    ['besættelse', d.assignments], ['viden', d.knowledge], ['successionsplan', d.successionPlans], ['evidens', d.evidence],
    ['vurdering', d.assessments], ['praksis', d.practices], ['handling', d.actions],
  ] as const) unique(name, xs as { id: string }[]);

  for (const g of d.goals) {
    if (!roles.has(g.ownerRoleId)) add('mål', g.id, `Ukendt ejerrolle ${g.ownerRoleId}`);
    for (const m of g.milestones) date('milepæl', m.id, m.planned);
  }
  for (const c of d.capabilities) {
    if (!units.has(c.unitId)) add('kapabilitet', c.id, `Ukendt enhed ${c.unitId}`);
    for (const g of c.goalIds) if (!goals.has(g)) add('kapabilitet', c.id, `Ukendt mål ${g}`);
    for (const p of c.capacity) {
      if (p.value.current < 0 || p.value.required < 0) add('kapabilitet', c.id, 'Negativ kapacitet');
    }
  }
  for (const r of d.roles) {
    if (!units.has(r.unitId)) add('rolle', r.id, `Ukendt enhed ${r.unitId}`);
    for (const c of r.capabilityIds) if (!caps.has(c)) add('rolle', r.id, `Ukendt kapabilitet ${c}`);
    if (r.criticality < 1 || r.criticality > 5) add('rolle', r.id, 'Kritikalitet uden for 1–5');
  }
  for (const p of d.persons) {
    if (!units.has(p.unitId)) add('person', p.id, `Ukendt enhed ${p.unitId}`);
    period('person', p.id, p.employedFrom, p.employedTo);
  }
  // Besættelser: gyldige referencer, inden for ansættelse og ingen overlap pr. rolle.
  for (const a of d.assignments) {
    if (!roles.has(a.roleId)) add('besættelse', a.id, `Ukendt rolle ${a.roleId}`);
    if (!persons.has(a.personId)) add('besættelse', a.id, `Ukendt person ${a.personId}`);
    period('besættelse', a.id, a.start, a.end);
    const p = personById.get(a.personId);
    if (p && p.employedTo && (a.end === null || a.end > p.employedTo)) add('besættelse', a.id, 'Besættelse rækker ud over ansættelsen');
  }
  for (const r of d.roles) {
    const as = d.assignments.filter((a) => a.roleId === r.id).sort((x, y) => x.start.localeCompare(y.start));
    for (let i = 1; i < as.length; i++) {
      const prev = as[i - 1]!;
      if (prev.end === null || prev.end >= as[i]!.start) add('besættelse', as[i]!.id, `Overlapper med ${prev.id} i rolle ${r.id}`);
    }
  }
  for (const k of d.knowledge) {
    if (!units.has(k.unitId)) add('viden', k.id, `Ukendt enhed ${k.unitId}`);
    for (const c of k.capabilityIds) if (!caps.has(c)) add('viden', k.id, `Ukendt kapabilitet ${c}`);
    for (const h of k.holders) {
      if (!persons.has(h.personId)) add('viden', k.id, `Ukendt holder ${h.personId}`);
      period('viden', k.id, h.from, h.to);
      const p = personById.get(h.personId);
      if (p && p.employedTo && (h.to === null || h.to > p.employedTo)) add('viden', k.id, `Holder ${h.personId} rækker ud over ansættelsen`);
    }
    for (const doc of k.documentation) if (doc.value < 0 || doc.value > 3) add('viden', k.id, 'Dokumentationsniveau uden for 0–3');
  }
  for (const s of d.successionPlans) {
    if (!roles.has(s.roleId)) add('successionsplan', s.id, `Ukendt rolle ${s.roleId}`);
    if (!roles.has(s.ownerRoleId)) add('successionsplan', s.id, `Ukendt ejerrolle ${s.ownerRoleId}`);
    for (const c of s.candidates) {
      if (!persons.has(c.personId)) add('successionsplan', s.id, `Ukendt kandidat ${c.personId}`);
      period('successionsplan', s.id, c.from, c.to);
      for (const a of c.assessments) {
        for (const e of a.evidenceIds) if (!evidence.has(e)) add('successionsplan', s.id, `Ukendt evidens ${e}`);
        if (!roles.has(a.assessorRoleId)) add('successionsplan', s.id, `Ukendt vurderende rolle ${a.assessorRoleId}`);
        if (a.basis === 'dokumenteret' && a.evidenceIds.length === 0) add('successionsplan', s.id, `Dokumenteret vurdering af ${c.personId} uden evidens`);
      }
    }
  }
  if (new Set(d.successionPlans.map((s) => s.roleId)).size !== d.successionPlans.length) add('successionsplan', '*', 'Mere end én plan pr. rolle');
  for (const e of d.evidence) {
    if (e.personId && !persons.has(e.personId)) add('evidens', e.id, `Ukendt person ${e.personId}`);
    if (e.roleId && !roles.has(e.roleId)) add('evidens', e.id, `Ukendt rolle ${e.roleId}`);
    if (e.capabilityId && !caps.has(e.capabilityId)) add('evidens', e.id, `Ukendt kapabilitet ${e.capabilityId}`);
    if (e.knowledgeId && !knowledge.has(e.knowledgeId)) add('evidens', e.id, `Ukendt vidensområde ${e.knowledgeId}`);
    period('evidens', e.id, e.date, e.endDate);
  }
  for (const a of d.assessments) {
    if (a.subjectType === 'kapabilitet' && !caps.has(a.subjectId)) add('vurdering', a.id, `Ukendt kapabilitet ${a.subjectId}`);
    if (!roles.has(a.assessorRoleId)) add('vurdering', a.id, `Ukendt vurderende rolle ${a.assessorRoleId}`);
  }
  for (const p of d.practices) {
    for (const u of p.unitIds) if (!units.has(u)) add('praksis', p.id, `Ukendt enhed ${u}`);
    if (p.ownerRoleId && !roles.has(p.ownerRoleId)) add('praksis', p.id, `Ukendt ejerrolle ${p.ownerRoleId}`);
    for (const c of p.carriers) if (!persons.has(c.personId)) add('praksis', p.id, `Ukendt bærer ${c.personId}`);
    for (const a of p.adherence) if (a.value < 0 || a.value > 1) add('praksis', p.id, 'Gennemførelsesgrad uden for 0–1');
  }
  for (const a of d.actions) {
    if (!roles.has(a.ownerRoleId)) add('handling', a.id, `Ukendt ejerrolle ${a.ownerRoleId}`);
    period('handling', a.id, a.start, a.due);
    date('handling', a.id, a.registered);
    if (a.expectedChanges.length === 0 && !a.effectNote) add('handling', a.id, 'Handling uden modelleret effekt skal have en forklaring');
  }
  for (const t of d.riskTreatments) {
    if (!roles.has(t.ownerRoleId)) add('risikobehandling', t.riskId, `Ukendt ejerrolle ${t.ownerRoleId}`);
    date('risikobehandling', t.riskId, t.registered);
    for (const a of t.actionIds) if (!actions.has(a)) add('risikobehandling', t.riskId, `Ukendt handling ${a}`);
  }
  return issues;
}
