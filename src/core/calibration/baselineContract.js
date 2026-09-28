/**
 * Canonical contract for longitudinal personal calibration.
 * Baselines are derived, never authoritative facts.
 */
export const BASELINE_CONTRACT_VERSION = '1.0';

export const BASELINE_METRICS = Object.freeze([
  'action_completion',
  'deferral_rate',
  'missed_action_rate',
  'session_length',
  'task_density',
  'preferred_action_hour',
  'goal_velocity',
  'capacity_load',
]);

export function normalizeBaselineMetric(metric) {
  const value = String(metric || '').trim().toLowerCase();
  if (!value) throw new Error('Baseline metric is required');
  return value.replace(/[^a-z0-9_:-]/g, '_');
}

export function buildBaselineMetadata({
  metric,
  evidenceIds = [],
  source = 'system',
  methodologyVersion = BASELINE_CONTRACT_VERSION,
  calculation = null,
  context = {},
} = {}) {
  return {
    metric: normalizeBaselineMetric(metric),
    evidenceIds: [...new Set(evidenceIds.filter(Boolean))],
    source,
    methodologyVersion,
    calculation,
    context,
    derived: true,
    immutableSource: true,
  };
}
