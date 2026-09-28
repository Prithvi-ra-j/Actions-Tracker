import { describe, expect, it } from 'vitest';
import { updateCalibrationBaseline, compareToBaseline } from '../../src/core/scoring/calibrationBaseline.js';
import { createScoreProjection } from '../../src/models/scoreSchema.js';

describe('longitudinal calibration baseline', () => {
  it('evolves deterministically from an observation sequence', () => {
    const observations = [
      { value: 40, occurredAt: '2026-09-01T08:00:00Z' },
      { value: 50, occurredAt: '2026-09-05T08:00:00Z' },
      { value: 60, occurredAt: '2026-09-10T08:00:00Z' },
      { value: 70, occurredAt: '2026-09-15T08:00:00Z' },
    ];
    const a = updateCalibrationBaseline(null, observations);
    const b = updateCalibrationBaseline(null, observations);
    expect(a).toEqual(b);
    expect(a.sampleSize).toBe(4);
    expect(a.value).toBeGreaterThan(40);
    expect(a.value).toBeLessThan(70);
    expect(a.trend).toBeGreaterThan(0);
  });

  it('preserves the prior baseline when no new observations exist', () => {
    const previous = updateCalibrationBaseline(null, [
      { value: 50, occurredAt: '2026-09-01T08:00:00Z' },
    ]);
    expect(updateCalibrationBaseline(previous, [])).toMatchObject({
      value: previous.value,
      sampleSize: previous.sampleSize,
      updated: false,
    });
  });

  it('exposes baseline comparison in score projections', () => {
    const projection = createScoreProjection({
      domain: 'discipline',
      value: 72,
      confidence: 0.8,
      coverage: 0.8,
      period: { start: '2026-09-01', end: '2026-09-28' },
      components: [],
      methodology: { engine: 'test', version: '1' },
      supportingEvidenceIds: ['e1'],
      observations: [
        { value: 50, occurredAt: '2026-09-01T08:00:00Z' },
        { value: 55, occurredAt: '2026-09-10T08:00:00Z' },
      ],
    });
    expect(projection.baseline.sampleSize).toBe(2);
    expect(projection.baselineComparison.direction).toBe('up');
  });
});
