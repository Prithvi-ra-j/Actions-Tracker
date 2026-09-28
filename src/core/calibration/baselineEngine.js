export const BASELINE_VERSION = '2.0';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function buildBaseline(observations = [], previous = null, {
  halfLifeDays = 30,
  now = new Date(),
} = {}) {
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  const valid = observations
    .map(o => ({ value: Number(o?.value), at: Date.parse(o?.occurredAt || o?.date || '') }))
    .filter(o => Number.isFinite(o.value) && Number.isFinite(o.at))
    .sort((a, b) => a.at - b.at);

  if (!valid.length) {
    return previous ? { ...previous, version: BASELINE_VERSION, updated: false } : {
      version: BASELINE_VERSION, value: null, variance: null, sampleSize: 0,
      confidence: 0, firstObservedAt: null, lastObservedAt: null, trendPerDay: 0,
      updated: false,
    };
  }

  let weighted = 0;
  let weightTotal = 0;
  for (const item of valid) {
    const ageDays = Math.max(0, (nowMs - item.at) / 86400000);
    const weight = Math.pow(0.5, ageDays / Math.max(1, halfLifeDays));
    weighted += item.value * weight;
    weightTotal += weight;
  }

  const value = weighted / Math.max(weightTotal, 1e-9);
  const variance = valid.reduce((sum, item) => {
    const ageDays = Math.max(0, (nowMs - item.at) / 86400000);
    const weight = Math.pow(0.5, ageDays / Math.max(1, halfLifeDays));
    return sum + weight * Math.pow(item.value - value, 2);
  }, 0) / Math.max(weightTotal, 1e-9);

  const first = valid[0];
  const last = valid[valid.length - 1];
  const spanDays = Math.max(1, (last.at - first.at) / 86400000);
  const trendPerDay = (last.value - first.value) / spanDays;
  const coverageConfidence = 1 - Math.exp(-valid.length / 8);
  const freshnessConfidence = Math.exp(-Math.max(0, (nowMs - last.at) / 86400000) / 45);
  const confidence = clamp(coverageConfidence * 0.7 + freshnessConfidence * 0.3, 0, 1);

  return {
    version: BASELINE_VERSION,
    value: Math.round(value * 1000) / 1000,
    variance: Math.round(variance * 1000) / 1000,
    sampleSize: valid.length,
    confidence: Math.round(confidence * 1000) / 1000,
    firstObservedAt: new Date(first.at).toISOString(),
    lastObservedAt: new Date(last.at).toISOString(),
    trendPerDay: Math.round(trendPerDay * 1000) / 1000,
    updated: true,
  };
}

export function compareToBaseline(value, baseline, { zThreshold = 1 } = {}) {
  const current = Number(value);
  const mean = Number(baseline?.value);
  if (!Number.isFinite(current) || !Number.isFinite(mean)) {
    return { delta: null, zScore: null, direction: 'unknown', severity: 'unknown' };
  }
  const sd = Math.sqrt(Math.max(0, Number(baseline?.variance) || 0));
  const delta = current - mean;
  const zScore = sd > 1e-9 ? delta / sd : delta === 0 ? 0 : Math.sign(delta) * Infinity;
  const magnitude = Math.abs(zScore);
  return {
    delta: Math.round(delta * 1000) / 1000,
    zScore: Number.isFinite(zScore) ? Math.round(zScore * 100) / 100 : zScore,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    severity: magnitude >= zThreshold * 2 ? 'high' : magnitude >= zThreshold ? 'medium' : 'normal',
  };
}

export function buildCapacityModel(observations = [], now = new Date()) {
  const baseline = buildBaseline(observations, null, { now, halfLifeDays: 45 });
  const current = observations.at(-1)?.value;
  return {
    availableCapacity: baseline.value,
    historicalCapacity: baseline.value,
    currentLoad: Number.isFinite(Number(current)) ? Number(current) : null,
    capacityVariance: baseline.variance,
    confidence: baseline.confidence,
  };
}
