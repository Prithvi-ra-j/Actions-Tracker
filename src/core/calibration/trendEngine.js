export function calculateTrend(observations = []) {
  const valid = observations.map(o => ({ value: Number(o?.value), at: Date.parse(o?.occurredAt || o?.date || '') }))
    .filter(o => Number.isFinite(o.value) && Number.isFinite(o.at));
  if (valid.length < 2) return { direction: 'unknown', slope: 0, confidence: 0 };
  const first = valid[0];
  const last = valid.at(-1);
  const days = Math.max(1, (last.at - first.at) / 86400000);
  const slope = (last.value - first.value) / days;
  return {
    direction: slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat',
    slope: Math.round(slope * 1000) / 1000,
    confidence: Math.min(1, valid.length / 10),
  };
}
