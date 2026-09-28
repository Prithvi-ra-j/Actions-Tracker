/**
 * Deterministic longitudinal calibration baseline.
 *
 * This module is intentionally pure: evidence windows are supplied by callers,
 * and the returned baseline can be persisted by the score/calibration layer.
 * It never invents observations when evidence is absent.
 */

export const CALIBRATION_BASELINE_VERSION = '1.0';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function updateCalibrationBaseline(previous = null, observations = []) {
  const valid = observations
    .map(item => ({
      value: Number(item?.value),
      occurredAt: Date.parse(item?.occurredAt || item?.date || ''),
    }))
    .filter(item => Number.isFinite(item.value) && Number.isFinite(item.occurredAt))
    .sort((a, b) => a.occurredAt - b.occurredAt);

  if (valid.length === 0) {
    return previous
      ? { ...previous, version: CALIBRATION_BASELINE_VERSION, updated: false }
      : {
          version: CALIBRATION_BASELINE_VERSION,
          value: null,
          variance: null,
          sampleSize: 0,
          firstObservedAt: null,
          lastObservedAt: null,
          trend: 0,
          updated: false,
        };
  }

  // Recency-weighted mean: recent observations influence the baseline more,
  // but no single event can dominate because alpha is capped.
  let mean = Number.isFinite(previous?.value) ? Number(previous.value) : valid[0].value;
  let variance = Number.isFinite(previous?.variance) ? Math.max(0, Number(previous.variance)) : 0;
  let priorCount = Number.isFinite(previous?.sampleSize) ? Math.max(0, previous.sampleSize) : 0;

  for (const observation of valid) {
    const alpha = clamp(2 / (Math.max(1, priorCount) + 2), 0.08, 0.5);
    const delta = observation.value - mean;
    mean += alpha * delta;
    variance = (1 - alpha) * (variance + alpha * delta * delta);
    priorCount += 1;
  }

  const first = valid[0].value;
  const last = valid[valid.length - 1].value;
  const spanDays = Math.max(1, (valid[valid.length - 1].occurredAt - valid[0].occurredAt) / 86400000);
  const trend = (last - first) / spanDays;

  return {
    version: CALIBRATION_BASELINE_VERSION,
    value: Math.round(mean * 1000) / 1000,
    variance: Math.round(variance * 1000) / 1000,
    sampleSize: priorCount,
    firstObservedAt: previous?.firstObservedAt || new Date(valid[0].occurredAt).toISOString(),
    lastObservedAt: new Date(valid[valid.length - 1].occurredAt).toISOString(),
    trend: Math.round(trend * 1000) / 1000,
    updated: true,
  };
}

export function compareToBaseline(value, baseline) {
  const current = Number(value);
  const baselineValue = Number(baseline?.value);
  if (!Number.isFinite(current) || !Number.isFinite(baselineValue)) {
    return { delta: null, direction: 'unknown' };
  }
  const delta = current - baselineValue;
  return {
    delta: Math.round(delta * 1000) / 1000,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
  };
}
