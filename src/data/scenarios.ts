/**
 * Scenarieskabeloner. Brugeren vælger parametre; standardværdierne peger på
 * demonstrationsdata, men alle parametre kan ændres i brugerfladen.
 */
import type { DocLevel, Id, Readiness, ScenarioChange } from '../domain/types';

export type ScenarioKind = 'nøgleperson' | 'to-personer' | 'efterfølger-klar' | 'viden-overført' | 'øget-behov';

export interface ScenarioParams {
  kind: ScenarioKind;
  personId: Id;
  secondPersonId: Id;
  promote: boolean;
  roleId: Id;
  candidateId: Id;
  readiness: Readiness;
  knowledgeId: Id;
  documentationLevel: DocLevel;
  newHolderId: Id | '';
  capabilityId: Id;
  requiredDeltaFte: number;
}

export const SCENARIO_KINDS: { kind: ScenarioKind; title: string; description: string }[] = [
  { kind: 'nøgleperson', title: 'En nøgleperson forlader virksomheden', description: 'Rolle, viden, kandidatur og praksis bortfalder for den valgte person.' },
  { kind: 'to-personer', title: 'To kritiske personer er utilgængelige samtidig', description: 'To personer i samme område er væk på samme tid, fx ved sygdom eller fratrædelse.' },
  { kind: 'efterfølger-klar', title: 'En planlagt efterfølger bliver klar', description: 'En kandidat vurderes klar på dokumenteret grundlag.' },
  { kind: 'viden-overført', title: 'Kritisk viden dokumenteres og overføres', description: 'Dokumentationen løftes, og en ny person bliver kvalificeret holder.' },
  { kind: 'øget-behov', title: 'Et strategisk mål øger behovet for en kapabilitet', description: 'Den krævede kapacitet øges, uden at den faktiske kapacitet følger med.' },
];

export const DEFAULT_PARAMS: ScenarioParams = {
  kind: 'nøgleperson',
  personId: 'P15',
  secondPersonId: 'P21',
  promote: true,
  roleId: 'R15',
  candidateId: 'P27',
  readiness: 'nu',
  knowledgeId: 'K03',
  documentationLevel: 2,
  newHolderId: 'P33',
  capabilityId: 'C01',
  requiredDeltaFte: 3,
};

/** Standardparametre pr. scenarietype (bruges, når brugeren skifter type). */
export const KIND_DEFAULTS: Record<ScenarioKind, Partial<ScenarioParams>> = {
  nøgleperson: { personId: 'P15', promote: true },
  'to-personer': { personId: 'P20', secondPersonId: 'P21', promote: true },
  'efterfølger-klar': { roleId: 'R15', candidateId: 'P27', readiness: 'nu' },
  'viden-overført': { knowledgeId: 'K03', documentationLevel: 2, newHolderId: 'P33' },
  'øget-behov': { capabilityId: 'C01', requiredDeltaFte: 3 },
};

export function changesFor(p: ScenarioParams): ScenarioChange[] {
  switch (p.kind) {
    case 'nøgleperson':
      return [{ type: 'personUnavailable', personId: p.personId, promoteReadySuccessor: p.promote }];
    case 'to-personer':
      return [
        { type: 'personUnavailable', personId: p.personId, promoteReadySuccessor: p.promote },
        { type: 'personUnavailable', personId: p.secondPersonId, promoteReadySuccessor: p.promote },
      ];
    case 'efterfølger-klar':
      return [{ type: 'successorReady', roleId: p.roleId, personId: p.candidateId, readiness: p.readiness }];
    case 'viden-overført':
      return [{ type: 'knowledgeTransfer', knowledgeId: p.knowledgeId, documentationLevel: p.documentationLevel, addHolderId: p.newHolderId || null }];
    case 'øget-behov':
      return [{ type: 'capabilityCapacity', capabilityId: p.capabilityId, requiredDeltaFte: p.requiredDeltaFte, currentDeltaFte: 0 }];
  }
}
