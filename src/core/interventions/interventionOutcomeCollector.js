import { evaluateIntervention, closeIntervention } from '../ai/interventionLearning.js';
import { updateIntervention, getIntervention } from '../../database/interventionRepository.js';

export async function collectInterventionOutcome(interventionId, {
  baseline,
  outcome,
  expected,
  higherIsBetter = true,
  minEffect = 0,
  completedAt = new Date().toISOString(),
} = {}) {
  const intervention = await getIntervention(interventionId);
  if (!intervention) throw new Error(`Intervention not found: ${interventionId}`);
  const evaluation = evaluateIntervention({ baseline, outcome, expected, higherIsBetter, minEffect });
  const completed = closeIntervention(intervention, evaluation, completedAt);
  await updateIntervention(interventionId, completed);
  return completed;
}
