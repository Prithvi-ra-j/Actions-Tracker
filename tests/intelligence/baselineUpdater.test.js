import { describe, expect, it } from 'vitest';
import { buildBaseline } from '../../src/core/calibration/baselineEngine.js';

describe('baseline updater', () => {
  it('weights recent behavior more heavily than stale behavior', () => {
    const baseline = buildBaseline([
      { value: 20, occurredAt: '2025-01-01' },
      { value: 80, occurredAt: '2026-01-01' },
    ], null, { now: new Date('2026-01-02'), halfLifeDays: 30 });
    expect(baseline.value).toBeGreaterThan(60);
  });
});
