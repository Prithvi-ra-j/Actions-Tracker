import { describe, expect, it } from 'vitest';
import { buildBaseline } from '../../src/core/calibration/baselineEngine.js';
import { applyInterventionLearning, summarizeInterventionLearning } from '../../src/core/ai/interventionLearning.js';

const DAY_MS = 86400000;
const START = Date.parse('2026-01-01T09:00:00.000Z');
const atDay = day => new Date(START + day * DAY_MS).toISOString();

const observations = Array.from({ length: 30 }, (_, index) => ({
  value: 50 + Math.min(index, 20) * 1.25 + (index % 4 === 0 ? 2 : 0),
  occurredAt: atDay(Math.min(90, 1 + index * 3)),
}));

describe('deterministic longitudinal certification fixture', () => {
  it('shows increasing calibration confidence at defined checkpoints', () => {
    const days = [1, 3, 7, 14, 30, 45, 60, 90];
    const checkpoints = days.map(day => buildBaseline(
      observations.filter(item => Date.parse(item.occurredAt) <= Date.parse(atDay(day))),
      null,
      { now: new Date(atDay(day)), halfLifeDays: 30 },
    ));

    expect(checkpoints.at(-1).confidence).toBeGreaterThan(checkpoints[0].confidence);
    expect(checkpoints.at(-1).sampleSize).toBeGreaterThan(checkpoints[0].sampleSize);
  });

  it('shows historical intervention outcomes changing future recommendation priority', () => {
    const learning = summarizeInterventionLearning([
      { status: 'completed', context: { recommendationType: 'focus_block' }, evaluation: { result: 'positive', effect: 8 } },
      { status: 'completed', context: { recommendationType: 'focus_block' }, evaluation: { result: 'positive', effect: 7 } },
      { status: 'completed', context: { recommendationType: 'focus_block' }, evaluation: { result: 'positive', effect: 9 } },
      { status: 'completed', context: { recommendationType: 'focus_block' }, evaluation: { result: 'negative', effect: -2 } },
    ]);

    expect(learning.overallPositiveRate).toBe(0.75);
    expect(applyInterventionLearning(50, 'focus_block', learning)).toBeGreaterThan(50);
  });
});
