export function calculateConfidence({ sampleSize = 0, coverage = 0, freshness = 0, contradictionRate = 0 } = {}) {
  const confidence = Math.max(0, Math.min(1,
    Math.min(1, sampleSize / 12) * 0.35 +
    Math.max(0, Math.min(1, coverage)) * 0.3 +
    Math.max(0, Math.min(1, freshness)) * 0.2 +
    (1 - Math.max(0, Math.min(1, contradictionRate))) * 0.15
  ));
  return Math.round(confidence * 1000) / 1000;
}
