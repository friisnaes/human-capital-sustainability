import type { Role } from '../../domain/types';
import { CRITICALITY } from '../../model/config';
import { fmtDate, fmtMonths } from '../../lib/format';
import { useRouter } from '../../lib/router';
import { useApp, useLookup } from '../../state/AppState';
import { DefList, SectionTitle } from '../../ui/Layout';
import { EmptyState } from '../../ui/Overlay';
import { BandBadge } from '../../ui/Status';
import { BasisMark, DetailLink, Readiness } from '../common';

const KIND_LABEL = { direktion: 'Direktion', leder: 'Lederrolle', nøglespecialist: 'Nøglespecialist' } as const;

export function RoleDetail({ role }: { role: Role }) {
  const { analysis, allRisks, data } = useApp();
  const { personName, roleTitle, unitName, caps } = useLookup();
  const { navigate } = useRouter();
  const s = analysis.succession.roles.get(role.id);
  const plan = data.successionPlans.find((p) => p.roleId === role.id);
  const holderId = s?.holderId ?? null;
  const heldKnowledge = holderId ? [...analysis.knowledge.values()].filter((k) => k.qualified.some((h) => h.personId === holderId) || k.trainees.some((h) => h.personId === holderId)) : [];
  const risks = allRisks.filter((r) => r.roleIds.includes(role.id) || (r.subject.type === 'rolle' && r.subject.id === role.id));
  const critical = role.criticality >= CRITICALITY.criticalRole;
  const evidenceById = new Map(data.evidence.map((e) => [e.id, e]));

  return (
    <div className="space-y-7">
      <DefList
        items={[
          ['Enhed', unitName(role.unitId)],
          ['Rolletype', KIND_LABEL[role.kind]],
          ['Kritikalitet', `${role.criticality} af 5${critical ? ' (kritisk rolle)' : ''}`],
          ['Rolleindehaver', holderId ? personName(holderId) : <span className="font-semibold text-risk">Ubesat</span>],
          [
            'Kapabiliteter',
            <span key="c" className="flex flex-col">
              {role.capabilityIds.map((c) => (
                <DetailLink key={c} type="kapabilitet" id={c}>
                  {caps.get(c)?.name}
                </DetailLink>
              ))}
            </span>,
          ],
          ['Genetablering ved ekstern rekruttering', `${fmtMonths(role.recruitMonths + role.rampUpMonths)} (${role.recruitMonths} rekruttering + ${role.rampUpMonths} indkøring)`],
        ]}
      />

      <section>
        <SectionTitle>Succession</SectionTitle>
        {!s?.hasPlan ? (
          <EmptyState title="Ingen registreret successionsplan">
            Dækningen er ukendt. Rollen tæller som manglende data i successionsberedskabet – ikke som nul – og trækker datadækningen ned.
          </EmptyState>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-rule p-3">
                <p className="text-2xs text-ink-muted">Effektiv dækning inden for 2 år</p>
                <p className="mt-1 font-medium">{s.effective2y ? personName(s.effective2y) : <span className="text-risk">Ingen</span>}</p>
                {s.lostToDoubleBooking2y && <p className="mt-1 text-2xs text-amber">Nominel kandidat er tildelt en rolle, der prioriteres højere.</p>}
              </div>
              <div className="rounded-md border border-rule p-3">
                <p className="text-2xs text-ink-muted">Nødberedskab (klar nu)</p>
                <p className="mt-1 font-medium">{s.effectiveNow ? personName(s.effectiveNow) : <span className="text-risk">Ingen</span>}</p>
                {s.lostToDoubleBookingNow && <p className="mt-1 text-2xs text-amber">Nominel kandidat er tildelt en rolle, der prioriteres højere.</p>}
              </div>
            </div>
            <p className="mt-2 text-2xs text-ink-muted">
              Plan ejet af {roleTitle(plan?.ownerRoleId)} · seneste review {fmtDate(s.lastReview)}. Effektiv dækning betyder, at hver kandidat kun kan dække ét behov ad gangen. Kandidater tildeles efter kritikalitet, derefter fremtidig betydning og tidligste strategiske frist.
            </p>
            {s.candidates.length === 0 ? (
              <p className="mt-3 text-sm text-risk">Planen har ingen kandidater.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {s.candidates.map((c) => (
                  <li key={c.personId} className="rounded-md border border-rule p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{personName(c.personId)}</p>
                      <Readiness value={c.readiness} />
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-2xs text-ink-muted">
                      <BasisMark basis={c.basis} />
                      <span>
                        Vurderet af {roleTitle(c.assessorRoleId)} {fmtDate(c.assessedOn)}
                      </span>
                    </p>
                    {c.evidenceIds.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-2xs text-ink-2">
                        {c.evidenceIds.map((id) => {
                          const e = evidenceById.get(id);
                          return e ? (
                            <li key={id}>
                              <span className="text-ink">{e.title}</span> · {fmtDate(e.date)}
                              {e.endDate ? `–${fmtDate(e.endDate)}` : ''} · kilde: {e.source}
                            </li>
                          ) : null;
                        })}
                      </ul>
                    )}
                    {c.developmentNeeds.length > 0 && (
                      <p className="mt-2 text-2xs text-ink-2">
                        <span className="font-semibold text-ink">Udviklingsbehov: </span>
                        {c.developmentNeeds.join(' · ')}
                      </p>
                    )}
                    {c.alsoCandidateFor.length > 0 && (
                      <p className="mt-2 text-2xs text-amber">
                        Også kandidat til:{' '}
                        {c.alsoCandidateFor.map((id, i) => (
                          <span key={id}>
                            {i > 0 && ', '}
                            <DetailLink type="rolle" id={id}>{roleTitle(id)}</DetailLink>
                          </span>
                        ))}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section>
        <SectionTitle>Kritisk viden hos rolleindehaveren</SectionTitle>
        {heldKnowledge.length === 0 ? (
          <p className="text-sm text-ink-muted">Ingen registrerede kritiske vidensområder.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {heldKnowledge.map((k) => (
              <li key={k.id} className="flex flex-wrap items-baseline justify-between gap-2">
                <DetailLink type="viden" id={k.id}>{k.area.name}</DetailLink>
                <span className="text-2xs text-ink-muted">
                  {k.qualified.length} kvalificerede · dokumentation {k.docLevel ?? '—'}/3
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle>Risici knyttet til rollen</SectionTitle>
        {risks.length === 0 ? (
          <p className="text-sm text-ink-muted">Ingen beregnede risici.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {risks.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <BandBadge band={r.band} priority={r.priority} />
                <DetailLink type="risiko" id={r.id}>{r.title}</DetailLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      {holderId && (
        <button type="button" className="btn" onClick={() => navigate('/scenarier', { s: 'nøgleperson', p: holderId, prom: '1' })}>
          Simulér, at rolleindehaveren bliver utilgængelig
        </button>
      )}
      <p className="text-2xs text-ink-muted">Personoplysninger er begrænset til rolle, dokumenteret evidens og daterede vurderinger med kilde. Platformen rangerer ikke mennesker.</p>
    </div>
  );
}
