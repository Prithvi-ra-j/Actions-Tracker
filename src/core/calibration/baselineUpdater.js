import { buildBaseline } from './baselineEngine.js';
import { getLatestBaseline, saveBaseline } from './baselineRepository.js';

export async function updatePersonalBaseline(metric, observations = [], options = {}) {
  const previous = await getLatestBaseline(metric);
  const baseline = buildBaseline(observations, previous, options);
  if (baseline.updated) await saveBaseline(metric, baseline, {
    evidenceIds: observations.map(o => o.evidenceId).filter(Boolean),
    source: options.source || 'system',
  });
  return baseline;
}

export async function updateBaselines(metrics = {}, options = {}) {
  const result = {};
  for (const [metric, observations] of Object.entries(metrics)) {
    result[metric] = await updatePersonalBaseline(metric, observations, options);
  }
  return result;
}
