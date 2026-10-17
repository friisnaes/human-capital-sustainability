/** Modul F – Human Capital Risk Dashboard™: prioriteret, filtrerbart risikoregister med eksport. */
import { useMemo } from 'react';
import type { RiskCategory, RiskStatus } from '../domain/types';
import { RISK_MODEL } from '../model/config';
import { BAND_LABEL, type Band, CATEGORY_LABEL, type Risk } from '../model/risk';
import { fmtDate, fmtMonth, plural } from '../lib/format';
import { useRouter } from '../lib/router';
import { useApp, useLookup } from '../state/AppState';
import { downloadText } from '../export/csv';
import { riskCsv } from '../export/riskCsv';
import { IconDownload, IconReset } from '../ui/icons';
import { PageHeader, Panel } from '../ui/Layout';
import { EmptyState, InfoTip } from '../ui/Overlay';
import { BandBadge, BAND_STATUS, RISK_STATUS_LABEL, RiskStatusText, StatusShape } from '../ui/Status';
import { DataTable } from '../ui/Table';
import { GoalChips } from './common';

const BANDS: Band[] = ['kritisk', 'høj', 'moderat', 'lav'];
const CATEGORIES = Object.keys(CATEGORY_LABEL) as RiskCategory[];
const STATUSES: (RiskStatus | 'ingen')[] = ['ingen', 'åben', 'under behandling', 'delvist afværget', 'accepteret'];

function RiskGrid({ risks }: { risks: Risk[] }) {
  const cells = new Map<string, Risk[]>();
  for (const r of risks) {
    const k = `${r.consequence.value}-${r.exposure.value}`;
    cells.set(k, [...(cells.get(k) ?? []), r]);
  }
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1 text-2xs">
        <caption className="sr-only">Antal risici fordelt på konsekvens og eksponering</caption>
        <thead>
          <tr>
            <th scope="col" className="w-20 text-left font-normal text-ink-muted">K \ E</th>
            {[1, 2, 3, 4, 5].map((e) => (
              <th key={e} scope="col" className="num w-11 text-center font-medium text-ink-2">
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[5, 4, 3, 2, 1].map((k) => (
            <tr key={k}>
              <th scope="row" className="num text-left font-medium text-ink-2">
                {k}
              </th>
              {[1, 2, 3, 4, 5].map((e) => {
                const list = cells.get(`${k}-${e}`) ?? [];
                const level = k * e;
                const bg = level >= 20 ? 'bg-risk-soft' : level >= 12 ? 'bg-amber-soft' : level >= 6 ? 'bg-sunk' : 'bg-paper';
                return (
                  <td key={e} className={`num h-10 w-11 rounded-sm text-center align-middle ${bg} ${list.length ? 'font-semibold text-ink' : 'text-ink-faint'}`} title={list.map((r) => r.title).join('\n')}>
                    {list.length || '·'}
                    {list.length > 0 && <span className="sr-only"> risici med konsekvens {k} og eksponering {e}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-2xs text-ink-muted">Rækker: konsekvens (K). Kolonner: eksponering (E). Beredskab (B) reducerer prioriteten og vises i tabellen.</p>
    </div>
  );
}

export default function RiskView() {
  const { risks, data, asOf, unitId, openDetail } = useApp();
  const { roleTitle, unitShort, goals } = useLookup();
  const { route, setParams } = useRouter();
  const q = route.query;
  const fCat = q.get('kat') as RiskCategory | null;
  const fBand = q.get('bånd') as Band | null;
  const fStatus = q.get('status') as RiskStatus | 'ingen' | null;
  const fGoal = q.get('mål');
  const fText = q.get('søg') ?? '';

  const filtered = useMemo(
    () =>
      risks.filter(
        (r) =>
          (!fCat || r.category === fCat) &&
          (!fBand || r.band === fBand) &&
          (!fStatus || (fStatus === 'ingen' ? !r.treatment : r.treatment?.status === fStatus)) &&
          (!fGoal || r.goalIds.includes(fGoal)) &&
          (!fText || `${r.title} ${r.businessConsequence} ${r.id}`.toLowerCase().includes(fText.toLowerCase())),
      ),
    [risks, fCat, fBand, fStatus, fGoal, fText],
  );

  const activeFilters = [
    fCat && `kategori: ${CATEGORY_LABEL[fCat]}`,
    fBand && `bånd: ${BAND_LABEL[fBand]}`,
    fStatus && `status: ${fStatus === 'ingen' ? 'ikke behandlet' : RISK_STATUS_LABEL[fStatus]}`,
    fGoal && `mål: ${goals.get(fGoal)?.code ?? fGoal}`,
    fText && `søgning: "${fText}"`,
  ].filter(Boolean) as string[];

  const exportCsv = () => {
    const csv = riskCsv(data, filtered, { asOf, unitId, filters: activeFilters.join(', '), exportedAt: new Date() });
    downloadText(`risikoudsnit-${asOf.slice(0, 7)}${unitId ? `-${unitId}` : ''}-demodata.csv`, csv);
  };

  const roots = new Set(filtered.map((r) => r.rootKey)).size;

  return (
    <div>
      <PageHeader
        eyebrow={`Modul F · ${fmtMonth(asOf)}`}
        title="Human Capital Risk Dashboard™"
        lede="Prioriteret register over organisatoriske risici. Hver risiko er udledt af grunddata og kan efterregnes: konsekvens, eksponering og beredskab holdes adskilt."
        actions={
          <button type="button" className="btn" onClick={exportCsv} disabled={filtered.length === 0}>
            <IconDownload /> Eksportér udsnit (CSV)
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel eyebrow="Fordeling" title={`${filtered.length} ${plural(filtered.length, 'risiko', 'risici')} i udsnittet`} className="h-full">
            <ul className="flex flex-wrap gap-x-6 gap-y-3">
              {BANDS.map((b) => {
                const n = filtered.filter((r) => r.band === b).length;
                return (
                  <li key={b}>
                    <button type="button" className={`flex items-center gap-2 rounded-sm px-1 py-0.5 ${fBand === b ? 'bg-sunk' : ''}`} onClick={() => setParams({ bånd: fBand === b ? null : b })} aria-pressed={fBand === b}>
                      <StatusShape status={BAND_STATUS[b]} size={11} />
                      <span className="num font-serif text-2xl font-semibold">{n}</span>
                      <span className="text-sm text-ink-2">{BAND_LABEL[b]}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-sm text-ink-2">
              Risiciene udspringer af <strong className="num">{roots}</strong> forskellige rødder (personer eller kapabiliteter). Står samme person bag flere risici, markeres de som relaterede, så eksponeringen ikke tælles dobbelt.
            </p>
            <p className="mt-3 rounded-sm border border-rule bg-paper px-3 py-2 font-mono text-2xs text-ink-2">
              Prioritet = 100 × K × E × (6 − B) ÷ 125 · Kritisk ≥ {RISK_MODEL.bands.kritisk} · Høj ≥ {RISK_MODEL.bands.høj} · Moderat ≥ {RISK_MODEL.bands.moderat}
            </p>
          </Panel>
        </div>
        <div className="lg:col-span-5">
          <Panel eyebrow="Risikokort" title="Konsekvens og eksponering" className="h-full">
            <RiskGrid risks={filtered} />
          </Panel>
        </div>
      </div>

      <section className="panel mt-6" aria-labelledby="register-titel">
        <div className="flex flex-col gap-4 border-b border-rule px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="register-titel" className="font-serif text-lg font-semibold">
              Risikoregister
            </h2>
            {activeFilters.length > 0 && (
              <button type="button" className="btn" onClick={() => setParams({ kat: null, bånd: null, status: null, mål: null, søg: null })}>
                <IconReset /> Nulstil filtre
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="flex flex-col gap-1 text-2xs text-ink-muted">
              Søg
              <input className="field" type="search" value={fText} placeholder="Titel eller id" onChange={(e) => setParams({ søg: e.target.value || null })} />
            </label>
            <label className="flex flex-col gap-1 text-2xs text-ink-muted">
              Kategori
              <select className="field" value={fCat ?? ''} onChange={(e) => setParams({ kat: e.target.value || null })}>
                <option value="">Alle kategorier</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-2xs text-ink-muted">
              Bånd
              <select className="field" value={fBand ?? ''} onChange={(e) => setParams({ bånd: e.target.value || null })}>
                <option value="">Alle bånd</option>
                {BANDS.map((b) => (
                  <option key={b} value={b}>
                    {BAND_LABEL[b]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-2xs text-ink-muted">
              Status
              <select className="field" value={fStatus ?? ''} onChange={(e) => setParams({ status: e.target.value || null })}>
                <option value="">Alle statusser</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === 'ingen' ? 'Ikke behandlet' : RISK_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-2xs text-ink-muted">
              Strategisk mål
              <select className="field" value={fGoal ?? ''} onChange={(e) => setParams({ mål: e.target.value || null })}>
                <option value="">Alle mål</option>
                {data.goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} – {g.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="px-2 pb-2">
          <DataTable<Risk>
            caption="Risikoregister"
            rows={filtered}
            rowKey={(r) => r.id}
            onRowClick={(r) => openDetail('risiko', r.id)}
            rowLabel={(r) => r.title}
            initialSort={{ key: 'prioritet', dir: 'desc' }}
            empty={
              <EmptyState
                title="Ingen risici matcher filtrene"
                action={
                  <button type="button" className="btn" onClick={() => setParams({ kat: null, bånd: null, status: null, mål: null, søg: null })}>
                    Nulstil filtre
                  </button>
                }
              />
            }
            columns={[
              {
                key: 'prioritet',
                header: 'Prioritet',
                render: (r) => <BandBadge band={r.band} priority={r.priority} />,
                sortValue: (r) => r.priority * 1000 + r.consequence.value * 100 + r.exposure.value * 10,
              },
              {
                key: 'risiko',
                header: 'Risiko',
                render: (r) => (
                  <span>
                    <span className="font-medium text-ink">{r.title}</span>
                    <span className="block text-2xs text-ink-muted">
                      {CATEGORY_LABEL[r.category]} · {unitShort(r.unitId)} · <span className="font-mono">{r.id}</span>
                      {r.relatedRiskIds.length > 0 && ` · deler rod med ${r.relatedRiskIds.length} ${r.relatedRiskIds.length === 1 ? 'anden' : 'andre'}`}
                    </span>
                  </span>
                ),
                sortValue: (r) => r.title,
              },
              { key: 'mål', header: 'Mål', render: (r) => <GoalChips goalIds={r.goalIds} /> },
              {
                key: 'keb',
                header: (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    K·E·B
                    <InfoTip label="K, E og B" align="right">
                      K = konsekvens, E = eksponering, B = beredskab. Alle på skala 1–5. Højt beredskab sænker prioriteten.
                    </InfoTip>
                  </span>
                ),
                render: (r) => (
                  <span className="num whitespace-nowrap font-mono text-2xs text-ink-2">
                    {r.consequence.value}·{r.exposure.value}·{r.readiness.value}
                  </span>
                ),
              },
              { key: 'horisont', header: 'Horisont', render: (r) => <span className="text-2xs text-ink-2">{r.horizon.label.split(' (')[0]}<span className="block text-ink-muted">{r.horizon.label.includes('(') ? `(${r.horizon.label.split(' (')[1]}` : ''}</span></span>, sortValue: (r) => r.horizon.months ?? 999 },
              {
                key: 'ansvarlig',
                header: 'Ansvarlig',
                render: (r) => (
                  <span className="text-2xs">
                    {roleTitle(r.treatment?.ownerRoleId ?? r.suggestedOwnerRoleId)}
                    {!r.treatment && <span className="block text-ink-muted">foreslået</span>}
                  </span>
                ),
              },
              { key: 'status', header: 'Status', render: (r) => <span className="text-2xs"><RiskStatusText status={r.treatment?.status ?? null} /></span>, sortValue: (r) => r.treatment?.status ?? 'å' },
              { key: 'opf', header: 'Opfølgning', render: (r) => <span className="num text-2xs">{r.treatment ? fmtDate(r.treatment.followUp) : '—'}</span>, sortValue: (r) => r.treatment?.followUp ?? null },
            ]}
          />
        </div>
        <p className="border-t border-rule px-5 py-3 text-2xs text-ink-muted">
          Eksporten indeholder præcis de risici, der vises med de aktive filtre, samt periode, enhed, modelversion og markering af demodata.
        </p>
      </section>
    </div>
  );
}
