/** Scenariesimulering – samme model, kopi af data, eksplicitte antagelser. */
import { useEffect, useMemo, type ReactNode } from 'react';
import type { DocLevel, Readiness as R } from '../domain/types';
import { changesFor, DEFAULT_PARAMS, KIND_DEFAULTS, SCENARIO_KINDS, type ScenarioKind, type ScenarioParams } from '../data/scenarios';
import { DIMENSIONS, STATUS_LABEL } from '../model/catalog';
import { CURRENT_MODEL } from '../model/config';
import { FINDING_LABEL } from '../model/dependencies';
import { runScenario } from '../model/scenario';
import { activeAt } from '../model/time';
import { fmtDate, fmtMonth, fmtMonths, fmtNumber, fmtScore } from '../lib/format';
import { useRouter } from '../lib/router';
import { clearLocal, readLocal, writeLocal } from '../lib/storage';
import { useApp, useLookup } from '../state/AppState';
import { Delta } from '../ui/Figures';
import { IconReset } from '../ui/icons';
import { PageHeader, Panel, SectionTitle } from '../ui/Layout';
import { EmptyState } from '../ui/Overlay';
import { BandBadge, StatusBadge } from '../ui/Status';

const KEYS: Record<keyof Omit<ScenarioParams, 'kind'>, string> = {
  personId: 'p',
  secondPersonId: 'p2',
  promote: 'prom',
  roleId: 'r',
  candidateId: 'c',
  readiness: 'rd',
  knowledgeId: 'k',
  documentationLevel: 'dl',
  newHolderId: 'nh',
  capabilityId: 'cap',
  requiredDeltaFte: 'fte',
};

function fromQuery(q: URLSearchParams, fallback: ScenarioParams): ScenarioParams {
  const kind = (q.get('s') as ScenarioKind) ?? fallback.kind;
  const p: ScenarioParams = { ...fallback, kind: SCENARIO_KINDS.some((k) => k.kind === kind) ? kind : fallback.kind };
  const get = (k: string) => q.get(k);
  if (get('p')) p.personId = get('p')!;
  if (get('p2')) p.secondPersonId = get('p2')!;
  if (get('prom')) p.promote = get('prom') === '1';
  if (get('r')) p.roleId = get('r')!;
  if (get('c')) p.candidateId = get('c')!;
  if (get('rd') && ['nu', '1-2', '3-5'].includes(get('rd')!)) p.readiness = get('rd') as R;
  if (get('k')) p.knowledgeId = get('k')!;
  if (get('dl') && ['0', '1', '2', '3'].includes(get('dl')!)) p.documentationLevel = Number(get('dl')) as DocLevel;
  if (q.has('nh')) p.newHolderId = get('nh') ?? '';
  if (get('cap')) p.capabilityId = get('cap')!;
  if (get('fte') && !Number.isNaN(Number(get('fte')))) p.requiredDeltaFte = Math.max(-20, Math.min(20, Number(get('fte'))));
  return p;
}

function toQuery(p: ScenarioParams): Record<string, string> {
  const out: Record<string, string> = { s: p.kind };
  const used: Record<ScenarioKind, (keyof ScenarioParams)[]> = {
    nøgleperson: ['personId', 'promote'],
    'to-personer': ['personId', 'secondPersonId', 'promote'],
    'efterfølger-klar': ['roleId', 'candidateId', 'readiness'],
    'viden-overført': ['knowledgeId', 'documentationLevel', 'newHolderId'],
    'øget-behov': ['capabilityId', 'requiredDeltaFte'],
  };
  for (const k of used[p.kind]) {
    const v = p[k];
    out[KEYS[k as keyof typeof KEYS]] = typeof v === 'boolean' ? (v ? '1' : '0') : String(v);
  }
  return out;
}

const STORAGE_KEY = 'scenarie';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-2xs font-medium text-ink-muted">
      {label}
      {children}
    </label>
  );
}

export default function ScenarioView() {
  const { data, asOf, unitId, unit, singlePersons } = useApp();
  const { personName, roleTitle, unitShort } = useLookup();
  const { route, navigate } = useRouter();
  const hasQuery = route.query.has('s');
  const stored = useMemo(() => readLocal<ScenarioParams>(STORAGE_KEY, DEFAULT_PARAMS), []);
  const employed = data.persons.filter((p) => activeAt(p.employedFrom, p.employedTo, asOf)).sort((a, b) => a.name.localeCompare(b.name, 'da'));
  const plansWithCandidates = data.successionPlans.filter((s) => s.established <= asOf && s.candidates.some((c) => activeAt(c.from, c.to, asOf) && activeAt(data.persons.find((x) => x.id === c.personId)!.employedFrom, data.persons.find((x) => x.id === c.personId)!.employedTo, asOf)));
  const params = normalize(fromQuery(route.query, hasQuery ? DEFAULT_PARAMS : { ...DEFAULT_PARAMS, ...stored }));

  /** Gør parametre gyldige for den valgte periode (fx en rolle uden plan i en tidlig periode). */
  function normalize(p: ScenarioParams): ScenarioParams {
    const ids = new Set(employed.map((x) => x.id));
    const preferred = singlePersons.find((id) => ids.has(id)) ?? employed[0]?.id ?? p.personId;
    const out = { ...p };
    if (!ids.has(out.personId)) out.personId = preferred;
    if (!ids.has(out.secondPersonId) || out.secondPersonId === out.personId) out.secondPersonId = employed.find((x) => x.id !== out.personId)?.id ?? out.secondPersonId;
    if (!plansWithCandidates.some((s) => s.roleId === out.roleId) && plansWithCandidates[0]) out.roleId = plansWithCandidates[0].roleId;
    const cands = data.successionPlans.find((s) => s.roleId === out.roleId)?.candidates.filter((c) => activeAt(c.from, c.to, asOf) && ids.has(c.personId)) ?? [];
    if (!cands.some((c) => c.personId === out.candidateId) && cands[0]) out.candidateId = cands[0].personId;
    if (out.newHolderId && !ids.has(out.newHolderId)) out.newHolderId = '';
    return out;
  }

  useEffect(() => {
    writeLocal(STORAGE_KEY, params);
  }, [JSON.stringify(params)]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<ScenarioParams>) => {
    const next = { ...params, ...patch };
    navigate('/scenarier', toQuery(next), { replace: true });
  };
  const setKind = (kind: ScenarioKind) => update({ kind, ...KIND_DEFAULTS[kind] });
  const reset = () => {
    clearLocal();
    navigate('/scenarier', toQuery(DEFAULT_PARAMS), { replace: true });
  };

  const plan = data.successionPlans.find((s) => s.roleId === params.roleId);
  const planCandidates = plan?.candidates.filter((c) => activeAt(c.from, c.to, asOf) && employed.some((x) => x.id === c.personId)) ?? [];

  const changes = changesFor(params);
  const valid =
    (params.kind !== 'to-personer' || params.personId !== params.secondPersonId) &&
    (params.kind !== 'efterfølger-klar' || planCandidates.some((c) => c.personId === params.candidateId));
  const result = useMemo(() => (valid ? runScenario(data, changes, asOf, unitId) : null), [data, JSON.stringify(changes), asOf, unitId, valid]); // eslint-disable-line react-hooks/exhaustive-deps
  const delta = result && result.before.score !== null && result.after.score !== null ? result.after.score - result.before.score : null;

  const personOption = (id: string) => {
    const p = data.persons.find((x) => x.id === id)!;
    return `${p.name} – ${p.title}${singlePersons.includes(id) ? ' (enkeltpersonsafhængighed)' : ''}`;
  };

  return (
    <div>
      <PageHeader
        eyebrow={`Beslutningsstøtte · ${unit?.name ?? 'Hele organisationen'} · ${fmtMonth(asOf)}`}
        title="Scenariesimulering"
        lede="Hvad sker der med robustheden, hvis …? Scenarier beregnes på en kopi af data med samme model som resten af platformen. Grunddata ændres ikke."
        actions={
          <button type="button" className="btn" onClick={reset}>
            <IconReset /> Nulstil scenarie
          </button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <Panel eyebrow="1 · Vælg scenarie" title="Scenarie">
            <fieldset>
              <legend className="sr-only">Scenarietype</legend>
              <div className="space-y-2">
                {SCENARIO_KINDS.map((k) => (
                  <label key={k.kind} className={`flex cursor-pointer gap-3 rounded-md border p-3 transition-colors ${params.kind === k.kind ? 'border-ink bg-white' : 'border-rule hover:border-ink-2'}`}>
                    <input type="radio" name="scenarie" className="mt-1 accent-[#14213A]" checked={params.kind === k.kind} onChange={() => setKind(k.kind)} />
                    <span>
                      <span className="block text-sm font-medium">{k.title}</span>
                      <span className="block text-2xs text-ink-muted">{k.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </Panel>
          <Panel eyebrow="2 · Antagelser" title="Parametre">
            <div className="space-y-3">
              {(params.kind === 'nøgleperson' || params.kind === 'to-personer') && (
                <>
                  <Field label={params.kind === 'to-personer' ? 'Første person' : 'Person'}>
                    <select className="field" value={params.personId} onChange={(e) => update({ personId: e.target.value })}>
                      {employed.map((p) => (
                        <option key={p.id} value={p.id}>
                          {personOption(p.id)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {params.kind === 'to-personer' && (
                    <Field label="Anden person">
                      <select className="field" value={params.secondPersonId} onChange={(e) => update({ secondPersonId: e.target.value })}>
                        {employed.map((p) => (
                          <option key={p.id} value={p.id}>
                            {personOption(p.id)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1 accent-[#14213A]" checked={params.promote} onChange={(e) => update({ promote: e.target.checked })} />
                    <span>
                      Efterfølgere, der er klar nu, rykker op
                      <span className="block text-2xs text-ink-muted">Efterfølgerens hidtidige rolle bliver i så fald ledig.</span>
                    </span>
                  </label>
                </>
              )}
              {params.kind === 'efterfølger-klar' && (
                <>
                  <Field label="Rolle">
                    <select
                      className="field"
                      value={params.roleId}
                      onChange={(e) => {
                        const p = data.successionPlans.find((s) => s.roleId === e.target.value);
                        update({ roleId: e.target.value, candidateId: p?.candidates.find((c) => activeAt(c.from, c.to, asOf))?.personId ?? '' });
                      }}
                    >
                      {plansWithCandidates.map((s) => (
                        <option key={s.roleId} value={s.roleId}>
                          {roleTitle(s.roleId)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Kandidat">
                    <select className="field" value={params.candidateId} onChange={(e) => update({ candidateId: e.target.value })}>
                      {planCandidates.map((c) => (
                        <option key={c.personId} value={c.personId}>
                          {personName(c.personId)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Nyt beredskab">
                    <select className="field" value={params.readiness} onChange={(e) => update({ readiness: e.target.value as R })}>
                      <option value="nu">Klar nu</option>
                      <option value="1-2">Klar inden for 1–2 år</option>
                    </select>
                  </Field>
                </>
              )}
              {params.kind === 'viden-overført' && (
                <>
                  <Field label="Vidensområde">
                    <select className="field" value={params.knowledgeId} onChange={(e) => update({ knowledgeId: e.target.value })}>
                      {data.knowledge.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.name} ({unitShort(k.unitId)})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Dokumentationsniveau efter overførsel">
                    <select className="field" value={params.documentationLevel} onChange={(e) => update({ documentationLevel: Number(e.target.value) as DocLevel })}>
                      <option value={0}>0 – ingen</option>
                      <option value={1}>1 – delvis</option>
                      <option value={2}>2 – dækkende</option>
                      <option value={3}>3 – dækkende og vedligeholdt</option>
                    </select>
                  </Field>
                  <Field label="Ny kvalificeret holder">
                    <select className="field" value={params.newHolderId} onChange={(e) => update({ newHolderId: e.target.value })}>
                      <option value="">Ingen ny holder</option>
                      {employed.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} – {p.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
              {params.kind === 'øget-behov' && (
                <>
                  <Field label="Kapabilitet">
                    <select className="field" value={params.capabilityId} onChange={(e) => update({ capabilityId: e.target.value })}>
                      {data.capabilities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Ændring i krævet kapacitet (årsværk)">
                    <input
                      className="field num"
                      type="number"
                      min={-20}
                      max={20}
                      step={0.5}
                      value={params.requiredDeltaFte}
                      onChange={(e) => update({ requiredDeltaFte: Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber })}
                    />
                  </Field>
                </>
              )}
            </div>
            <p className="mt-4 text-2xs text-ink-muted">
              Valgene gemmes i adressen (kan deles som link) og lokalt i browseren. Grunddata ændres ikke. Nulstil fjerner det lokalt gemte scenarie.
            </p>
          </Panel>
        </div>

        <div className="space-y-6 lg:col-span-8">
          {!result ? (
            <EmptyState title="Scenariet kan ikke beregnes">
              {params.kind === 'to-personer' ? 'Vælg to forskellige personer.' : 'Vælg en kandidat, der står i rollens successionsplan.'}
            </EmptyState>
          ) : (
            <>
              <Panel eyebrow="3 · Resultat" title="Organizational Resilience Score™ før og efter">
                <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
                  <div>
                    <p className="text-2xs text-ink-muted">Før</p>
                    <p className="num font-serif text-5xl font-semibold">{fmtScore(result.before.score)}</p>
                    <StatusBadge status={result.before.status} />
                  </div>
                  <div>
                    <p className="text-2xs text-ink-muted">Efter</p>
                    <p className="num font-serif text-5xl font-semibold">{fmtScore(result.after.score)}</p>
                    <StatusBadge status={result.after.status} />
                  </div>
                  <div className="pb-1 text-lg">
                    <Delta value={delta} />
                  </div>
                  <div className="pb-1">
                    <p className="text-2xs text-ink-muted">Estimeret genetableringstid</p>
                    <p className="num font-serif text-2xl font-semibold">{result.rebuildMonths === null ? 'Ingen' : fmtMonths(result.rebuildMonths)}</p>
                  </div>
                </div>
                {result.before.status !== result.after.status && (
                  <p className="mt-3 text-sm">
                    Status ændres fra <strong>{STATUS_LABEL[result.before.status].toLowerCase()}</strong> til <strong>{STATUS_LABEL[result.after.status].toLowerCase()}</strong>.
                  </p>
                )}
                {result.after.capApplied && !result.before.capApplied && <p className="mt-2 text-2xs text-amber">Svaghedsloftet begrænser scoren efter scenariet.</p>}
                {(params.kind === 'nøgleperson' || params.kind === 'to-personer') && result.dimensionDeltas.some((d) => (d.delta ?? 0) >= 0.5) && (
                  <p className="mt-3 rounded-sm border border-amber-mark/40 bg-amber-soft/50 px-3 py-2 text-2xs leading-relaxed text-ink-2">
                    <strong className="text-ink">Bemærk stigningen i {result.dimensionDeltas.filter((d) => (d.delta ?? 0) >= 0.5).map((d) => DIMENSIONS[d.id].name.toLowerCase()).join(' og ')}:</strong> flere indikatorer er andele. Forlader en kandidat eller praksisbærer uden registreret udvikling organisationen, kan andelen af de tilbageværende stige. Det er en sammensætningseffekt – ikke en reel forbedring.
                  </p>
                )}
                {(params.kind === 'nøgleperson' || params.kind === 'to-personer') && (
                  <p className="mt-3 rounded-sm border border-rule bg-paper px-3 py-2 text-2xs leading-relaxed text-ink-2">
                    <strong className="text-ink">Sådan læses resultatet:</strong> ORS måler sårbarhed, før noget sker. En kendt enkeltpersonsafhængighed er allerede trukket fra i scoren. Når tabet indtræffer, ses konsekvensen derfor især i udækkede behov, genetableringstid og nye risici – ikke nødvendigvis i et stort fald i scoren.
                  </p>
                )}
                <div className="mt-5 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <caption className="sr-only">Dimensioner før og efter scenariet</caption>
                  <thead>
                    <tr>
                      <th className="th !px-0">Dimension</th>
                      <th className="th text-right">Før</th>
                      <th className="th text-right">Efter</th>
                      <th className="th !pr-0 text-right">Ændring</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.dimensionDeltas.map((d) => (
                      <tr key={d.id} className={d.delta !== null && Math.abs(d.delta) >= 0.5 ? 'bg-sunk/50' : ''}>
                        <td className="td !px-0">{DIMENSIONS[d.id].name}</td>
                        <td className="td num text-right">{fmtScore(d.before)}</td>
                        <td className="td num text-right">{fmtScore(d.after)}</td>
                        <td className="td num !pr-0 text-right">{d.delta === null ? '—' : Math.abs(d.delta) < 0.5 ? <span className="text-ink-muted">uændret</span> : <Delta value={d.delta} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </Panel>

              <div className="grid gap-6 md:grid-cols-2">
                <Panel eyebrow="Udækkede behov" title={`${result.uncovered.length} behov uden dækning`} className="h-full">
                  {result.uncovered.length === 0 ? (
                    <p className="text-sm text-ink-muted">Scenariet efterlader ingen ubesatte roller, tabt viden, nye kapacitetsgab eller praksisser uden bærer.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {result.uncovered.map((u, i) => (
                        <li key={i} className="border-b border-rule pb-2 last:border-b-0">
                          <span className="flex justify-between gap-3">
                            <span className="font-medium">{u.label}</span>
                            <span className="num shrink-0 text-2xs text-ink-2">{u.rebuildMonths === null ? '' : fmtMonths(u.rebuildMonths)}</span>
                          </span>
                          <span className="block text-2xs text-ink-muted">
                            {u.kind} · {u.detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
                <Panel eyebrow="Afhængigheder" title="Ændrede afhængigheder" className="h-full">
                  {result.newFindings.length + result.resolvedFindings.length + result.realizedFindings.length + result.changedFindings.length === 0 ? (
                    <p className="text-sm text-ink-muted">Ingen ændringer i de registrerede afhængigheder.</p>
                  ) : (
                    <>
                      {result.newFindings.length > 0 && (
                        <>
                          <SectionTitle>Nye ({result.newFindings.length})</SectionTitle>
                          <ul className="mb-3 space-y-1 text-2xs">
                            {result.newFindings.map((f) => (
                              <li key={f.key}>
                                <span className="font-semibold text-risk">+</span> {FINDING_LABEL[f.kind]}: <span className="text-ink">{f.label}</span> <span className="text-ink-muted">– {f.detail}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      {result.realizedFindings.length > 0 && (
                        <>
                          <SectionTitle>Indtruffet ({result.realizedFindings.length})</SectionTitle>
                          <ul className="mb-3 space-y-1 text-2xs">
                            {result.realizedFindings.map((f) => (
                              <li key={f.key}>
                                <span className="font-semibold text-risk">!</span> {FINDING_LABEL[f.kind]}: <span className="text-ink">{f.label}</span> <span className="text-ink-muted">– afhængigheden er ikke løst, den er indtruffet</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      {result.changedFindings.length > 0 && (
                        <>
                          <SectionTitle>Forværret ({result.changedFindings.length})</SectionTitle>
                          <ul className="mb-3 space-y-1 text-2xs">
                            {result.changedFindings.map((f) => (
                              <li key={f.key}>
                                <span className="font-semibold text-risk">↓</span> {FINDING_LABEL[f.kind]}: <span className="text-ink">{f.label}</span> <span className="text-ink-muted">– {f.detail}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      {result.resolvedFindings.length > 0 && (
                        <>
                          <SectionTitle>Fjernet ({result.resolvedFindings.length})</SectionTitle>
                          <ul className="space-y-1 text-2xs">
                            {result.resolvedFindings.map((f) => (
                              <li key={f.key}>
                                <span className="font-semibold text-teal">−</span> {FINDING_LABEL[f.kind]}: <span className="text-ink">{f.label}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </>
                  )}
                </Panel>
              </div>

              <Panel eyebrow="Risici" title="Ændringer i risikoregistret">
                {result.newRisks.length + result.resolvedRisks.length + result.changedRisks.length === 0 ? (
                  <p className="text-sm text-ink-muted">Ingen ændringer i de beregnede risici.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {result.newRisks.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center gap-2">
                        <span className="text-2xs font-semibold text-risk">Ny</span>
                        <BandBadge band={r.band} priority={r.priority} /> {r.title}
                      </li>
                    ))}
                    {result.changedRisks.map(({ risk, before }) => (
                      <li key={risk.id} className="flex flex-wrap items-center gap-2">
                        <span className={`text-2xs font-semibold ${risk.priority > before ? 'text-risk' : 'text-teal'}`}>{risk.priority > before ? 'Højere' : 'Lavere'}</span>
                        <BandBadge band={risk.band} priority={risk.priority} /> {risk.title} <span className="num text-2xs text-ink-muted">(før {before})</span>
                      </li>
                    ))}
                    {result.resolvedRisks.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center gap-2">
                        <span className="text-2xs font-semibold text-teal">Fjernet</span> {r.title}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel eyebrow="Gennemsigtighed" title="Valgte antagelser">
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  {result.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                  <li>Beregnet {fmtDate(asOf)} med model v{CURRENT_MODEL.version} for {unit?.name ?? 'hele organisationen'}.</li>
                  <li>Ændringer anvendes på en kopi af data; grunddata og historik er uændrede.</li>
                  {(params.kind === 'nøgleperson' || params.kind === 'to-personer') && <li>Scenariet er en antagelse om fravær. Platformen beregner ingen sandsynlighed for, at personen forlader virksomheden.</li>}
                  {params.kind === 'øget-behov' && <li>Krævet kapacitet ændres med {fmtNumber(params.requiredDeltaFte, 1)} årsværk; den faktiske kapacitet er uændret.</li>}
                </ul>
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
