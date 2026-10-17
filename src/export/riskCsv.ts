/** Eksport af det aktuelle risikoudsnit som CSV. */
import type { Dataset, Id } from '../domain/types';
import { CURRENT_MODEL, RISK_MODEL } from '../model/config';
import { BAND_LABEL, CATEGORY_LABEL, type Risk } from '../model/risk';
import { fmtDate, fmtMonth } from '../lib/format';
import { toCsv } from './csv';

export function riskCsv(data: Dataset, risks: Risk[], ctx: { asOf: string; unitId: Id | null; filters: string; exportedAt: Date }): string {
  const role = (id: Id | null | undefined) => (id ? data.roles.find((r) => r.id === id)?.title ?? id : '');
  const unit = (id: Id) => data.units.find((u) => u.id === id)?.name ?? id;
  const goal = (id: Id) => data.goals.find((g) => g.id === id)?.code ?? id;
  const action = (id: Id) => data.actions.find((a) => a.id === id)?.title ?? id;
  const meta = [
    'Human Capital Sustainability™ – risikoudsnit',
    'FIKTIVE DEMODATA',
    `Organisation: ${data.organization.name}`,
    `Periode: ${fmtMonth(ctx.asOf)}`,
    `Enhed: ${ctx.unitId ? unit(ctx.unitId) : 'Hele organisationen'}`,
    `Filtre: ${ctx.filters || 'ingen'}`,
    `Model: ORS v${CURRENT_MODEL.version}, risiko v${RISK_MODEL.version}`,
    `Eksporteret: ${fmtDate(ctx.exportedAt.toISOString().slice(0, 10))}`,
  ];
  const header = [
    'Id', 'Risiko', 'Kategori', 'Enhed', 'Strategiske mål', 'Berørte roller', 'Berørte kapabiliteter',
    'Konsekvens (K)', 'Eksponering (E)', 'Beredskab (B)', 'Prioritet', 'Bånd', 'Vurderet sandsynlighed',
    'Tidshorisont', 'Forretningskonsekvens', 'Datakvalitet', 'Afværgeforanstaltninger', 'Anbefalet handling',
    'Ansvarlig rolle', 'Status', 'Opfølgning', 'Samme rod som',
  ];
  const rows = risks.map((r) => [
    r.id,
    r.title,
    CATEGORY_LABEL[r.category],
    r.unitIds.map(unit).join(' | '),
    r.goalIds.map(goal).join(' | '),
    r.roleIds.map(role).join(' | '),
    r.capabilityIds.map((c) => data.capabilities.find((x) => x.id === c)?.name ?? c).join(' | '),
    r.consequence.value,
    r.exposure.value,
    r.readiness.value,
    r.priority,
    BAND_LABEL[r.band],
    r.probability ? `${r.probability.value} (vurdering)` : 'Ikke vurderet',
    r.horizon.label,
    r.businessConsequence,
    r.dataQuality.level,
    r.treatment?.mitigations.join(' | ') ?? '',
    r.treatment?.actionIds.length ? r.treatment.actionIds.map(action).join(' | ') : r.recommendation,
    role(r.treatment?.ownerRoleId ?? r.suggestedOwnerRoleId) + (r.treatment ? '' : ' (foreslået)'),
    r.treatment?.status ?? 'ikke behandlet',
    r.treatment ? fmtDate(r.treatment.followUp) : '',
    r.relatedRiskIds.join(' | '),
  ]);
  return toCsv(meta, header, rows);
}
