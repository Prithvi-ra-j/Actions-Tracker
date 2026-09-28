import { addFact, getAllFacts } from '../../database/factsRepository.js';
import { buildBaseline } from './baselineEngine.js';
import { getLatestBaseline, saveBaseline } from './baselineRepository.js';

export async function recordCalibrationObservation(metric, {
  value,
  occurredAt = new Date().toISOString(),
  evidenceId = null,
  context = {},
} = {}, options = {}) {
  if (!metric || !Number.isFinite(Number(value))) throw new Error('metric and numeric value are required');

  const observationId = await addFact({
    type: 'calibration.observation',
    objectId: metric,
    value: Number(value),
    occurredAt,
    meta: { metric, evidenceId, context, version: '2.0' },
  });

  const facts = await getAllFacts();
  const observations = facts
    .filter(f => f.type === 'calibration.observation' && f.objectId === metric)
    .map(f => ({
      value: Number(f.value),
      occurredAt: f.occurredAt || f.createdAt,
      evidenceId: f.meta?.evidenceId,
    }));

  const previous = await getLatestBaseline(metric);
  const baseline = buildBaseline(observations, previous, options);
  if (baseline.updated) {
    await saveBaseline(metric, baseline, {
      evidenceIds: observations.map(o => o.evidenceId).filter(Boolean),
      source: options.source || 'system',
    });
  }

  return { observationId, baseline };
}

export async function updatePersonalBaseline(metric, observations = [], options = {}) {
  let baseline = await getLatestBaseline(metric);
  for (const observation of observations) {
    const result = await recordCalibrationObservation(metric, observation, options);
    baseline = result.baseline;
  }
  return baseline;
}

export async function updateBaselines(metrics = {}, options = {}) {
  const result = {};
  for (const [metric, observations] of Object.entries(metrics)) {
    result[metric] = await updatePersonalBaseline(metric, observations, options);
  }
  return result;
}
