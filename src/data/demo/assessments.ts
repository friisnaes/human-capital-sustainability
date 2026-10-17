/**
 * FIKTIVE DEMONSTRATIONSDATA – direktionens vurderinger af kapabiliteternes
 * betydning for fremtidens strategi (1–5). Vurderingerne er menneskelige
 * vurderinger og er markeret som sådan.
 */
import type { Assessment, Scale5 } from '../../domain/types';

const SEMINAR_2025 = '2025-06-15';
const SEMINAR_2026 = '2026-04-20';

function fi(id: string, capabilityId: string, date: string, value: Scale5, rationale: string): Assessment {
  return { id, kind: 'fremtidig-betydning', subjectType: 'kapabilitet', subjectId: capabilityId, value, date, assessorRoleId: 'R01', basis: 'vurdering', rationale };
}

export const assessments: Assessment[] = [
  fi('V01', 'C01', SEMINAR_2025, 5, 'Bærer prisløftet i serviceaftalerne (M1).'),
  fi('V02', 'C02', SEMINAR_2025, 5, 'Platformen er forudsætning for alle digitale services.'),
  fi('V03', 'C03', SEMINAR_2025, 4, 'Nødvendig for at omsætte platformen til abonnementer.'),
  fi('V04', 'C04', SEMINAR_2025, 5, 'Afgørende for Nova-platformens konkurrenceevne.'),
  fi('V05', 'C05', SEMINAR_2025, 4, 'Uden godkendelse ingen lancering af Nova.'),
  fi('V06', 'C06', SEMINAR_2025, 3, 'Fortsat vigtig, men moden og stabil.'),
  fi('V07', 'C07', SEMINAR_2025, 4, 'Forsyningssikkerhed for elektronik er en strategisk flaskehals.'),
  fi('V08', 'C08', SEMINAR_2025, 4, 'Vækstmålet i DACH hviler på få store kunder.'),
  fi('V09', 'C09', SEMINAR_2025, 4, 'Serviceaftalernes lønsomhed afhænger af korrekt prissætning.'),
  fi('V10', 'C10', SEMINAR_2025, 3, 'Understøttende kapabilitet.'),
  fi('V11', 'C10', SEMINAR_2026, 4, 'Opjusteret: flere samtidige omstillinger kræver stærkere forandringsledelse.'),
  fi('V12', 'C06', SEMINAR_2026, 3, 'Uændret.'),
  // Vurderede sandsynligheder anvendes kun på organisatoriske hændelser – aldrig på enkeltpersoners afgang.
  {
    id: 'V13', kind: 'sandsynlighed', subjectType: 'risiko', subjectId: 'KAP-C01', value: 4, date: '2026-09-10', assessorRoleId: 'R23', basis: 'vurdering',
    rationale: 'Sandsynligt, at gabet består i 12 mdr.: to stillinger har været opslået i fire måneder uden ansættelse.',
  },
  {
    id: 'V14', kind: 'sandsynlighed', subjectType: 'risiko', subjectId: 'KAP-C02', value: 3, date: '2026-09-10', assessorRoleId: 'R24', basis: 'vurdering',
    rationale: 'Muligt, at gabet består: konsulentaftalen udløber marts 2027.',
  },
];
