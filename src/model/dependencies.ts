/**
 * Strategic Dependency Mapper™ – afhængigheder mellem strategiske mål,
 * kapabiliteter, roller, nøglepersoner og kritisk viden.
 */
import type { Id } from '../domain/types';
import { CRITICALITY } from './config';
import { type Ctx, futureImportance, inScope, personName, practiceCarriersAt, roleHolder } from './context';
import type { Analysis } from './ors';

export type FindingKind =
  | 'enkeltperson'
  | 'videnskoncentration'
  | 'utilstrækkelig backup'
  | 'manglende dokumentation'
  | 'lang genetablering'
  | 'kulturbærer';

export const FINDING_LABEL: Record<FindingKind, string> = {
  enkeltperson: 'Afhængighed af én person',
  videnskoncentration: 'Koncentration af kritisk viden',
  'utilstrækkelig backup': 'Utilstrækkelig backup i kritisk rolle',
  'manglende dokumentation': 'Manglende dokumentation',
  'lang genetablering': 'Lang tid til genetablering',
  kulturbærer: 'Praksis båret af én person',
};

export interface Finding {
  key: string;
  kind: FindingKind;
  subject: { type: 'person' | 'rolle' | 'viden' | 'praksis'; id: Id };
  label: string;
  detail: string;
  unitId: Id;
  /** Alle enheder, afhængigheden vedrører. */
  unitIds?: Id[];
  /** Personer, der indgår i afhængigheden. */
  personIds: Id[];
}

export type NodeType = 'mål' | 'kapabilitet' | 'rolle' | 'person' | 'viden';

export interface GraphNode {
  id: string; // fx "rolle:R15"
  type: NodeType;
  refId: Id;
  label: string;
  sublabel: string;
  unitId: Id | null;
  flags: FindingKind[];
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: 'mål-kapabilitet' | 'kapabilitet-rolle' | 'rolle-person' | 'person-viden';
  /** Svag relation (fx vidensholder under oplæring). */
  weak: boolean;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  findings: Finding[];
}

export function computeFindings(a: Analysis): Finding[] {
  const { ctx } = a;
  const out: Finding[] = [];
  for (const kv of a.knowledge.values()) {
    const k = kv.area;
    if (k.criticality < CRITICALITY.criticalKnowledge) continue;
    if (kv.qualified.length <= 1) {
      out.push({
        key: `videnskoncentration:${k.id}`,
        kind: 'videnskoncentration',
        subject: { type: 'viden', id: k.id },
        label: k.name,
        detail: kv.lost ? 'Ingen kvalificerede holdere' : `Kun ${personName(ctx, kv.qualified[0]?.personId)} er kvalificeret`,
        unitId: k.unitId,
        personIds: kv.qualified.map((h) => h.personId),
      });
      const holder = kv.qualified[0];
      if (holder) {
        out.push({
          key: `enkeltperson:${holder.personId}:${k.id}`,
          kind: 'enkeltperson',
          subject: { type: 'person', id: holder.personId },
          label: personName(ctx, holder.personId),
          detail: `Eneste kvalificerede holder af "${k.name}"`,
          unitId: k.unitId,
          personIds: [holder.personId],
        });
      }
    }
    if ((kv.docLevel ?? 0) <= 1) {
      out.push({
        key: `manglende dokumentation:${k.id}`,
        kind: 'manglende dokumentation',
        subject: { type: 'viden', id: k.id },
        label: k.name,
        detail: kv.docLevel === null ? 'Dokumentation ikke vurderet' : `Dokumentationsniveau ${kv.docLevel} af 3`,
        unitId: k.unitId,
        personIds: [],
      });
    }
    if ((kv.rebuildMonths ?? 0) >= 9) {
      out.push({
        key: `lang genetablering:viden:${k.id}`,
        kind: 'lang genetablering',
        subject: { type: 'viden', id: k.id },
        label: k.name,
        detail: `Ca. ${Math.round(kv.rebuildMonths ?? 0)} mdr. at genetablere ved tab af holder`,
        unitId: k.unitId,
        personIds: kv.qualified.map((h) => h.personId),
      });
    }
  }
  for (const role of ctx.data.roles) {
    if (role.criticality < CRITICALITY.criticalRole) continue;
    const s = a.succession.roles.get(role.id);
    if (!s || s.effective2y) continue;
    const holder = roleHolder(ctx, role.id);
    out.push({
      key: `utilstrækkelig backup:${role.id}`,
      kind: 'utilstrækkelig backup',
      subject: { type: 'rolle', id: role.id },
      label: role.title,
      detail: !s.hasPlan ? 'Ingen registreret successionsplan' : s.lostToDoubleBooking2y ? 'Kandidat dobbeltbooket' : 'Ingen efterfølger klar inden for 2 år',
      unitId: role.unitId,
      personIds: holder ? [holder.id] : [],
    });
    const months = role.recruitMonths + role.rampUpMonths;
    if (months >= 12) {
      out.push({
        key: `lang genetablering:rolle:${role.id}`,
        kind: 'lang genetablering',
        subject: { type: 'rolle', id: role.id },
        label: role.title,
        detail: `Ca. ${months} mdr. ved ekstern rekruttering og indkøring`,
        unitId: role.unitId,
        personIds: holder ? [holder.id] : [],
      });
      if (holder && !out.some((f) => f.kind === 'enkeltperson' && f.subject.id === holder.id)) {
        out.push({
          key: `enkeltperson:${holder.id}:${role.id}`,
          kind: 'enkeltperson',
          subject: { type: 'person', id: holder.id },
          label: holder.name,
          detail: `Kritisk rolle (${role.title}) uden effektiv efterfølger og med lang genetablering`,
          unitId: role.unitId,
          personIds: [holder.id],
        });
      }
    }
  }
  for (const p of ctx.data.practices) {
    if (p.registered > ctx.asOf || p.importance < 4) continue;
    const carriers = practiceCarriersAt(ctx, p);
    if (carriers.length <= 1) {
      out.push({
        key: `kulturbærer:${p.id}`,
        kind: 'kulturbærer',
        subject: { type: 'praksis', id: p.id },
        label: p.name,
        detail: carriers[0] ? `Bæres alene af ${personName(ctx, carriers[0].personId)}` : 'Ingen aktive bærere',
        unitId: p.unitIds[0] ?? 'KON',
        unitIds: p.unitIds,
        personIds: carriers.map((c) => c.personId),
      });
    }
  }
  return out;
}

/** Unikke personer med en kritisk enkeltpersonsafhængighed i udsnittet. */
export function findingInScope(f: Finding, scope: Id | null): boolean {
  return scope === null || (f.unitIds ?? [f.unitId]).includes(scope);
}

export function singlePersonDependencies(findings: Finding[], scope: Id | null): Id[] {
  return [...new Set(findings.filter((f) => f.kind === 'enkeltperson' && findingInScope(f, scope)).map((f) => f.subject.id))].sort();
}

export function buildGraph(a: Analysis, scope: Id | null, findings: Finding[]): DependencyGraph {
  const { ctx } = a;
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const flagsFor = (type: Finding['subject']['type'], id: Id) =>
    [...new Set(findings.filter((f) => f.subject.type === type && f.subject.id === id).map((f) => f.kind))];

  const caps = ctx.data.capabilities.filter((c) => inScope(c.unitId, scope));
  const capIds = new Set(caps.map((c) => c.id));
  for (const c of caps) {
    nodes.set(`kapabilitet:${c.id}`, {
      id: `kapabilitet:${c.id}`, type: 'kapabilitet', refId: c.id, label: c.name,
      sublabel: `Fremtidig betydning ${futureImportance(ctx, c.id) ?? '—'}`, unitId: c.unitId, flags: [],
    });
    for (const gid of c.goalIds) {
      const g = ctx.data.goals.find((x) => x.id === gid);
      if (!g) continue;
      nodes.set(`mål:${g.id}`, { id: `mål:${g.id}`, type: 'mål', refId: g.id, label: `${g.code} ${g.title}`, sublabel: `Frist ${g.deadline.slice(0, 4)}`, unitId: null, flags: [] });
      edges.push({ from: `mål:${g.id}`, to: `kapabilitet:${c.id}`, kind: 'mål-kapabilitet', weak: false });
    }
  }
  const roles = ctx.data.roles.filter((r) => inScope(r.unitId, scope) && r.capabilityIds.some((c) => capIds.has(c)));
  for (const r of roles) {
    const holder = roleHolder(ctx, r.id);
    nodes.set(`rolle:${r.id}`, {
      id: `rolle:${r.id}`, type: 'rolle', refId: r.id, label: r.title, sublabel: `Kritikalitet ${r.criticality}`,
      unitId: r.unitId, flags: flagsFor('rolle', r.id),
    });
    for (const cid of r.capabilityIds) if (capIds.has(cid)) edges.push({ from: `kapabilitet:${cid}`, to: `rolle:${r.id}`, kind: 'kapabilitet-rolle', weak: false });
    if (holder) {
      nodes.set(`person:${holder.id}`, {
        id: `person:${holder.id}`, type: 'person', refId: holder.id, label: holder.name, sublabel: holder.title,
        unitId: holder.unitId, flags: flagsFor('person', holder.id),
      });
      edges.push({ from: `rolle:${r.id}`, to: `person:${holder.id}`, kind: 'rolle-person', weak: false });
    }
  }
  for (const kv of a.knowledge.values()) {
    const k = kv.area;
    if (!inScope(k.unitId, scope) || k.criticality < CRITICALITY.knowledgeInScope) continue;
    nodes.set(`viden:${k.id}`, {
      id: `viden:${k.id}`, type: 'viden', refId: k.id, label: k.name,
      sublabel: `Dok. ${kv.docLevel ?? '—'}/3 · ${kv.qualified.length} holdere`, unitId: k.unitId, flags: flagsFor('viden', k.id),
    });
    for (const h of [...kv.qualified, ...kv.trainees]) {
      const pid = `person:${h.personId}`;
      if (!nodes.has(pid)) {
        const p = ctx.personById.get(h.personId);
        if (!p) continue;
        nodes.set(pid, { id: pid, type: 'person', refId: p.id, label: p.name, sublabel: p.title, unitId: p.unitId, flags: flagsFor('person', p.id) });
      }
      edges.push({ from: pid, to: `viden:${k.id}`, kind: 'person-viden', weak: h.level === 'under oplæring' });
    }
  }
  const scopedFindings = findings.filter((f) => findingInScope(f, scope));
  return { nodes: [...nodes.values()], edges, findings: scopedFindings };
}

/** Hjælpefunktion til kontekstuel visning af, hvem der bærer en rolle. */
export function holderName(ctx: Ctx, roleId: Id): string {
  return roleHolder(ctx, roleId)?.name ?? 'Ubesat';
}
