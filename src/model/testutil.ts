/** Hjælpere til tests: et lille, kontrolleret datasæt. Bruges kun af testfiler. */
import type { Dataset } from '../domain/types';

export function miniDataset(): Dataset {
  return {
    organization: { id: 'O', name: 'Test A/S', industry: 'Test', employees: 10, strategyName: 'T', description: '', fictional: true },
    units: [
      { id: 'U1', orgId: 'O', name: 'Enhed 1', shortName: 'E1', description: '', growthCritical: true },
      { id: 'U2', orgId: 'O', name: 'Enhed 2', shortName: 'E2', description: '', growthCritical: false },
    ],
    goals: [
      {
        id: 'G1', code: 'G1', title: 'Mål', description: '', deadline: '2028-12-31', ownerRoleId: 'RA',
        milestones: [
          { id: 'G1-1', title: 'Rettidig', planned: '2026-03-31', completed: '2026-04-15' },
          { id: 'G1-2', title: 'Forsinket', planned: '2026-05-31', completed: '2026-08-01' },
          { id: 'G1-3', title: 'Fremtidig', planned: '2027-03-31', completed: null },
        ],
      },
    ],
    capabilities: [
      {
        id: 'CA', unitId: 'U1', name: 'Kapabilitet A', description: '', goalIds: ['G1'], capacitySource: 'test',
        capacity: [
          { date: '2025-09-30', value: { required: 10, current: 4 } },
          { date: '2026-09-30', value: { required: 10, current: 7 } },
        ],
      },
      {
        id: 'CB', unitId: 'U2', name: 'Kapabilitet B', description: '', goalIds: ['G1'], capacitySource: 'test',
        capacity: [
          { date: '2025-09-30', value: { required: 4, current: 4 } },
          { date: '2026-09-30', value: { required: 4, current: 6 } },
        ],
      },
    ],
    roles: [
      { id: 'RA', unitId: 'U1', title: 'Rolle A', kind: 'leder', leadership: true, criticality: 5, capabilityIds: ['CA'], recruitMonths: 6, rampUpMonths: 6 },
      { id: 'RB', unitId: 'U1', title: 'Rolle B', kind: 'leder', leadership: true, criticality: 4, capabilityIds: ['CA'], recruitMonths: 3, rampUpMonths: 3 },
      { id: 'RC', unitId: 'U2', title: 'Rolle C', kind: 'nøglespecialist', leadership: false, criticality: 4, capabilityIds: ['CB'], recruitMonths: 3, rampUpMonths: 3 },
    ],
    persons: [
      { id: 'PA', name: 'Person A', unitId: 'U1', title: '', employedFrom: '2020-01-01', employedTo: null },
      { id: 'PB', name: 'Person B', unitId: 'U1', title: '', employedFrom: '2020-01-01', employedTo: null },
      { id: 'PC', name: 'Person C', unitId: 'U2', title: '', employedFrom: '2020-01-01', employedTo: null },
      { id: 'PX', name: 'Kandidat X', unitId: 'U1', title: '', employedFrom: '2020-01-01', employedTo: null },
    ],
    assignments: [
      { id: 'A1', roleId: 'RA', personId: 'PA', start: '2020-01-01', end: null, source: 'ekstern', onboarding: null },
      { id: 'A2', roleId: 'RB', personId: 'PB', start: '2020-01-01', end: null, source: 'ekstern', onboarding: null },
      { id: 'A3', roleId: 'RC', personId: 'PC', start: '2026-03-01', end: null, source: 'intern', onboarding: 'struktureret' },
    ],
    knowledge: [
      {
        id: 'KA', unitId: 'U1', name: 'Viden A', description: '', capabilityIds: ['CA'], criticality: 5, baseRebuildMonths: 12,
        documentation: [{ date: '2025-01-01', value: 1 }],
        holders: [{ personId: 'PA', level: 'ekspert', from: '2020-01-01', to: null }],
      },
      {
        id: 'KB', unitId: 'U2', name: 'Viden B', description: '', capabilityIds: ['CB'], criticality: 4, baseRebuildMonths: 6,
        documentation: [{ date: '2025-01-01', value: 3 }],
        holders: [
          { personId: 'PC', level: 'ekspert', from: '2020-01-01', to: null },
          { personId: 'PB', level: 'praktiker', from: '2020-01-01', to: null },
        ],
      },
    ],
    successionPlans: [
      {
        id: 'SA', roleId: 'RA', ownerRoleId: 'RA', established: '2024-01-01', reviews: ['2026-06-01'],
        candidates: [{ personId: 'PX', from: '2024-01-01', to: null, developmentNeeds: [], assessments: [{ date: '2025-06-01', readiness: '1-2', basis: 'vurdering', assessorRoleId: 'RA', evidenceIds: [] }] }],
      },
      {
        id: 'SB', roleId: 'RB', ownerRoleId: 'RA', established: '2024-01-01', reviews: ['2026-06-01'],
        candidates: [{ personId: 'PX', from: '2024-01-01', to: null, developmentNeeds: [], assessments: [{ date: '2025-06-01', readiness: 'nu', basis: 'vurdering', assessorRoleId: 'RA', evidenceIds: [] }] }],
      },
    ],
    evidence: [],
    assessments: [
      { id: 'V1', kind: 'fremtidig-betydning', subjectType: 'kapabilitet', subjectId: 'CA', value: 5, date: '2025-01-01', assessorRoleId: 'RA', basis: 'vurdering', rationale: '' },
      { id: 'V2', kind: 'fremtidig-betydning', subjectType: 'kapabilitet', subjectId: 'CB', value: 3, date: '2025-01-01', assessorRoleId: 'RA', basis: 'vurdering', rationale: '' },
    ],
    practices: [],
    riskTreatments: [],
    actions: [],
    dataAsOf: '2026-09-30',
  };
}
