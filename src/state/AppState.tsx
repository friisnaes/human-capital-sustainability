/**
 * Applikationstilstand: datagrundlag, globale filtre og afledte beregninger.
 *
 * Globale filtre (enhed og periode) ligger i adressen, så direkte links og
 * genindlæsning gengiver præcis samme visning. Alle tal beregnes her én gang
 * pr. filterkombination og deles af alle moduler, så dashboard og
 * detaljevisninger altid viser de samme tal.
 */
import { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react';
import type { BusinessUnit, Dataset, Id, ISODate } from '../domain/types';
import { HISTORY_END, HISTORY_START } from '../data/period';
import { useRouter } from '../lib/router';
import { computeFindings, type Finding, singlePersonDependencies } from '../model/dependencies';
import { computeHistory, type History, type Snapshot } from '../model/history';
import { computeOrs, createAnalysis, type Analysis, type OrsResult } from '../model/ors';
import { computeDataQuality, type DataQuality } from '../model/quality';
import { computeRisks, risksInScope, type Risk } from '../model/risk';
import { monthEnds, periodEnd, periodKey } from '../model/time';

export type DetailType = 'risiko' | 'rolle' | 'kapabilitet' | 'viden' | 'praksis' | 'handling';

export interface AppValue {
  data: Dataset;
  periods: ISODate[];
  unitId: Id | null;
  unit: BusinessUnit | null;
  asOf: ISODate;
  isLatest: boolean;
  analysis: Analysis;
  ors: OrsResult;
  orsOrg: OrsResult;
  unitOrs: { unit: BusinessUnit; ors: OrsResult }[];
  allRisks: Risk[];
  risks: Risk[];
  findings: Finding[];
  singlePersons: Id[];
  history: History;
  snapshot: Snapshot | undefined;
  comparison: Snapshot | undefined;
  quality: DataQuality;
  setUnit: (id: Id | null) => void;
  setPeriod: (key: string) => void;
  openDetail: (type: DetailType, id: Id) => void;
  closeDetail: () => void;
  detail: { type: DetailType; id: Id } | null;
}

const Ctx = createContext<AppValue | null>(null);

const DETAIL_TYPES: DetailType[] = ['risiko', 'rolle', 'kapabilitet', 'viden', 'praksis', 'handling'];

/** Sammenligningsperiode: tre måneder (ét kvartal) før den valgte periode. */
export const COMPARISON_MONTHS = 3;

export function AppProvider({ data, children }: { data: Dataset; children: ReactNode }) {
  const { route, setParams } = useRouter();
  const periods = useMemo(() => monthEnds(HISTORY_START, HISTORY_END), []);

  const unitParam = route.query.get('enhed');
  const unit = data.units.find((u) => u.id === unitParam) ?? null;
  const unitId = unit?.id ?? null;
  const periodParam = route.query.get('periode');
  const asOf = periods.find((p) => periodKey(p) === periodParam) ?? periods[periods.length - 1]!;

  const analysis = useMemo(() => createAnalysis(data, asOf), [data, asOf]);
  const orsOrg = useMemo(() => computeOrs(analysis, null), [analysis]);
  const ors = useMemo(() => (unitId === null ? orsOrg : computeOrs(analysis, unitId)), [analysis, unitId, orsOrg]);
  const unitOrs = useMemo(() => data.units.map((u) => ({ unit: u, ors: computeOrs(analysis, u.id) })), [analysis, data.units]);
  const allRisks = useMemo(() => computeRisks(analysis), [analysis]);
  const risks = useMemo(() => risksInScope(allRisks, unitId), [allRisks, unitId]);
  const findings = useMemo(() => computeFindings(analysis), [analysis]);
  const singlePersons = useMemo(() => singlePersonDependencies(findings, unitId), [findings, unitId]);
  const history = useMemo(() => computeHistory(data, unitId, HISTORY_START, HISTORY_END), [data, unitId]);
  const idx = history.snapshots.findIndex((s) => s.date === asOf);
  const snapshot = history.snapshots[idx];
  const comparison = idx >= COMPARISON_MONTHS ? history.snapshots[idx - COMPARISON_MONTHS] : undefined;
  const quality = useMemo(() => computeDataQuality(analysis, unitId, ors), [analysis, unitId, ors]);

  const vis = route.query.get('vis');
  const detail = useMemo(() => {
    if (!vis) return null;
    const [type, id] = vis.split(':');
    if (!type || !id || !DETAIL_TYPES.includes(type as DetailType)) return null;
    return { type: type as DetailType, id };
  }, [vis]);

  const setUnit = useCallback((id: Id | null) => setParams({ enhed: id }, { replace: false }), [setParams]);
  const setPeriod = useCallback(
    (key: string) => setParams({ periode: key === periodKey(periods[periods.length - 1]!) ? null : key }, { replace: false }),
    [setParams, periods],
  );
  const openDetail = useCallback((type: DetailType, id: Id) => setParams({ vis: `${type}:${id}` }, { replace: false }), [setParams]);
  const closeDetail = useCallback(() => setParams({ vis: null }, { replace: false }), [setParams]);

  const value: AppValue = {
    data,
    periods,
    unitId,
    unit,
    asOf,
    isLatest: asOf === periods[periods.length - 1],
    analysis,
    ors,
    orsOrg,
    unitOrs,
    allRisks,
    risks,
    findings,
    singlePersons,
    history,
    snapshot,
    comparison,
    quality,
    setUnit,
    setPeriod,
    openDetail,
    closeDetail,
    detail,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp skal bruges inden for AppProvider');
  return v;
}

/** Små opslagsfunktioner til visning. */
export function useLookup() {
  const { data } = useApp();
  return useMemo(() => {
    const units = new Map(data.units.map((u) => [u.id, u]));
    const roles = new Map(data.roles.map((r) => [r.id, r]));
    const persons = new Map(data.persons.map((p) => [p.id, p]));
    const caps = new Map(data.capabilities.map((c) => [c.id, c]));
    const knowledge = new Map(data.knowledge.map((k) => [k.id, k]));
    const goals = new Map(data.goals.map((g) => [g.id, g]));
    const practices = new Map(data.practices.map((p) => [p.id, p]));
    const actions = new Map(data.actions.map((a) => [a.id, a]));
    return {
      units,
      roles,
      persons,
      caps,
      knowledge,
      goals,
      practices,
      actions,
      unitName: (id: Id | null | undefined) => (id ? units.get(id)?.name ?? id : 'Hele organisationen'),
      unitShort: (id: Id | null | undefined) => (id ? units.get(id)?.shortName ?? id : 'Alle'),
      roleTitle: (id: Id | null | undefined) => (id ? roles.get(id)?.title ?? id : '—'),
      personName: (id: Id | null | undefined) => (id ? persons.get(id)?.name ?? id : '—'),
      capName: (id: Id | null | undefined) => (id ? caps.get(id)?.name ?? id : '—'),
      goalCode: (id: Id) => goals.get(id)?.code ?? id,
    };
  }, [data]);
}

export { periodEnd, periodKey };
