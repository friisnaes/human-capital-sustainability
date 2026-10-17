/** Om demonstrationen: fiktive data, begrænsninger, lokal lagring og nulstilling. */
import { useState } from 'react';
import { CURRENT_MODEL, RISK_MODEL } from '../model/config';
import { fmtDate } from '../lib/format';
import { Link } from '../lib/router';
import { clearLocal, countLocal } from '../lib/storage';
import { useApp } from '../state/AppState';
import { IconCheck, IconReset } from '../ui/icons';
import { PageHeader, Panel } from '../ui/Layout';

export default function AboutView() {
  const { data } = useApp();
  const [stored, setStored] = useState(() => countLocal());
  const [done, setDone] = useState(false);
  const reset = () => {
    clearLocal();
    setStored(countLocal());
    setDone(true);
  };
  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Dokumentation"
        title="Om demonstrationen"
        lede="Human Capital Sustainability™ er her vist som en statisk, interaktiv demonstration med fiktive data. Siden beskriver, hvad der er implementeret – og hvad der ikke er."
      />
      <div className="space-y-6">
        <Panel eyebrow="Data" title="Alle data er fiktive">
          <p className="text-sm leading-relaxed">
            {data.organization.name} er en opdigtet virksomhed med {data.units.length} forretningsenheder, {data.roles.length} nøgle- og lederroller, {data.persons.length} fiktive personer og {data.capabilities.length} strategiske kapabiliteter. Historikken dækker 13 måneder, og alle viste tal beregnes fra de samme grunddata. Enhver lighed med virkelige virksomheder eller personer er tilfældig.
          </p>
          <p className="mt-2 text-sm">Data er senest opdateret {fmtDate(data.dataAsOf)}. Modelversion ORS v{CURRENT_MODEL.version}, risikomodel v{RISK_MODEL.version}.</p>
        </Panel>

        <Panel eyebrow="Sikkerhed og persondata" title="Hvad demonstrationen ikke gør">
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
            <li>Der er <strong>ingen login, ingen adgangskontrol og ingen roller</strong>. Alle, der har linket, ser det samme.</li>
            <li>Der er <strong>ingen server og ingen database</strong>. Data ligger i applikationens kode og beregnes i browseren.</li>
            <li>Der sker <strong>ingen sikker opbevaring af persondata</strong>, og demonstrationen må ikke bruges med virkelige personoplysninger.</li>
            <li>Der er <strong>ingen auditlog</strong> over, hvem der har set eller ændret hvad.</li>
            <li>Der sendes ingen data til tredjeparter. Skrifttyper er indlejret i applikationen.</li>
          </ul>
          <p className="mt-3 text-sm text-ink-2">
            En produktionsløsning kræver backend, database, login med roller, kryptering, databeskyttelse og auditlog. Arkitekturen er beskrevet i repositoryets dokumentation (docs/ARKITEKTUR.md) sammen med et SQL-skema til den fremtidige løsning.
          </p>
        </Panel>

        <Panel eyebrow="Lokal lagring" title="Dine valg gemmes kun i din browser">
          <p className="text-sm leading-relaxed">
            Demonstrationen gemmer kun dit senest anvendte scenarie lokalt i browseren, så det er der, når du vender tilbage. Filtre og visninger ligger i adressen, så links kan deles. Grunddata ændres aldrig.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className="btn" onClick={reset}>
              <IconReset /> Nulstil lokalt gemte valg
            </button>
            <span className="text-2xs text-ink-muted" role="status" aria-live="polite">
              {done ? (
                <span className="inline-flex items-center gap-1 text-teal">
                  <IconCheck size={14} /> Nulstillet. {stored} gemte valg tilbage.
                </span>
              ) : (
                `${stored} gemte valg i denne browser.`
              )}
            </span>
          </div>
        </Panel>

        <Panel eyebrow="Metode" title="Hvordan skal tallene læses?">
          <p className="text-sm leading-relaxed">
            Organizational Resilience Score™ er en forklarlig prototype til beslutningsstøtte. Alle formler, vægte og tærskler står i{' '}
            <Link to="/model" className="link">
              modelkataloget
            </Link>
            . Vægte og tærskler er faglige antagelser, der skal kalibreres og valideres med virkelige data, før scoren bruges som styringsmål. Scoren viser sårbarhed – ikke årsagssammenhænge.
          </p>
        </Panel>

        <Panel eyebrow="Før brug med virkelige data" title="Nødvendige skridt">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
            <li>Afklar formål, retsgrundlag og dataminimering (GDPR art. 5 og 6) samt en konsekvensanalyse (DPIA), fordi platformen behandler oplysninger om medarbejderes roller, udvikling og vurderinger.</li>
            <li>Inddrag medarbejderrepræsentanter og informér de registrerede om behandlingen.</li>
            <li>Etablér login med rollebaseret adgang (direktion, bestyrelse, HR, enhedsledere), kryptering og auditlog.</li>
            <li>Fastlæg ejerskab og opdateringsrytme for hver datakilde, og afgør, hvem der må afgive vurderinger.</li>
            <li>Kalibrér vægte og tærskler mod virkelige forløb, og dokumentér ændringer som nye modelversioner.</li>
          </ol>
        </Panel>
      </div>
    </div>
  );
}
