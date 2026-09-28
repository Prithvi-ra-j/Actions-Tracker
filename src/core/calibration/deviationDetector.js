import { compareToBaseline } from './baselineEngine.js';

export function detectDeviation(metric, value, baseline, options = {}) {
  const comparison = compareToBaseline(value, baseline, options);
  if (comparison.severity === 'unknown' || comparison.severity === 'normal') return null;
  return {
    type: 'baseline_deviation',
    metric,
    severity: comparison.severity,
    confidence: Number(baseline?.confidence || 0),
    ...comparison,
    title: `${metric} deviated from personal baseline`,
    evidence: {
      metric,
      currentValue: Number(value),
      baselineValue: baseline.value,
      baselineSampleSize: baseline.sampleSize,
    },
  };
}
