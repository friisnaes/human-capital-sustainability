/**
 * Samlet demonstrationsdatasæt. ALLE DATA ER FIKTIVE.
 */
import type { Dataset } from '../../domain/types';
import { HISTORY_END } from '../period';
import { assessments } from './assessments';
import { actions, riskTreatments } from './governance';
import { practices } from './culture';
import { knowledge } from './knowledge';
import { assignments, persons } from './people';
import { capabilities, goals, organization, roles, units } from './structure';
import { evidence, successionPlans } from './succession';

export const demoDataset: Dataset = {
  organization,
  units,
  goals,
  capabilities,
  roles,
  persons,
  assignments,
  knowledge,
  successionPlans,
  evidence,
  assessments,
  practices,
  riskTreatments,
  actions,
  dataAsOf: HISTORY_END,
};

export { HISTORY_END, HISTORY_START } from '../period';
