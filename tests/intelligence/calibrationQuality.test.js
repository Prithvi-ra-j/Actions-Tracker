import { describe, expect, it } from 'vitest';
import { buildBaseline, compareToBaseline } from '../../src/core/calibration/baselineEngine.js';

describe('longitudinal calibration quality', () => {
  it('learns a personal baseline from repeated observations', () => {
    const baseline = buildBaseline([
      { value: 78, occurredAt: '2026-01-01' },
      { value: 80, occurredAt: '2026-01-10' },
      { value: 77, occurredAt: '2026-01-20' },
      { value: 79, occurredAt: '2026-01-30' },
    ], null, { now: new Date('2026-02-01') });
    expect(baseline.sampleSize).toBe(4);
    expect(baseline.confidence).toBeGreaterThan(0);
    expect(compareToBaseline(50, baseline).severity).toBe('high');
  });
});
