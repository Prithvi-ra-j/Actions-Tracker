/**
 * tests/properties/independence.test.js
 *
 * Property: activity on one axis must not affect another axis's stat.
 * This tests the axis isolation guarantee.
 *
 * Invariant: logs filtered to axis X must not influence the stat of axis Y (X ≠ Y).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeAllStats } from '../../src/helpers/statsEngine.js';

const AXES = ['strength', 'discipline', 'knowledge', 'wisdom', 'creativity', 'strategy'];

const TODAY = '2025-06-15';

function daysAgo(n) {
  const d = new Date(TODAY + 'T00:00:00');
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const defaultAxisConfigs = AXES.map(axis => ({
  axis,
  hasConsistencyTerm: axis !== 'wisdom',
  expectedPerWeek: axis === 'wisdom' ? null : 4,
  paused: false,
}));

describe('axis independence', () => {
  it('adding strength-only logs does not change knowledge stat', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (count) => {
          const baseResult = computeAllStats([], defaultAxisConfigs, [], TODAY);

          const strengthLogs = Array.from({ length: count }, (_, i) => ({
            id: crypto.randomUUID(),
            date: daysAgo(i % 30),
            type: 'gym_session',
            axis: 'strength',
          }));

          const withStrengthResult = computeAllStats(strengthLogs, defaultAxisConfigs, [], TODAY);

          // Strength should have changed (it now has activity)
          // Knowledge should be exactly the same (no knowledge logs added)
          expect(withStrengthResult.knowledge).toBe(baseResult.knowledge);
          expect(withStrengthResult.wisdom).toBe(baseResult.wisdom);
          expect(withStrengthResult.creativity).toBe(baseResult.creativity);
          expect(withStrengthResult.strategy).toBe(baseResult.strategy);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('adding wisdom-only logs does not change strength stat', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (count) => {
          const baseResult = computeAllStats([], defaultAxisConfigs, [], TODAY);

          const wisdomLogs = Array.from({ length: count }, (_, i) => ({
            id: crypto.randomUUID(),
            date: daysAgo(i % 30),
            type: 'journal_entry',
            axis: 'wisdom',
          }));

          const withWisdomResult = computeAllStats(wisdomLogs, defaultAxisConfigs, [], TODAY);

          expect(withWisdomResult.strength).toBe(baseResult.strength);
          expect(withWisdomResult.discipline).toBe(baseResult.discipline);
          expect(withWisdomResult.knowledge).toBe(baseResult.knowledge);
          expect(withWisdomResult.creativity).toBe(baseResult.creativity);
          expect(withWisdomResult.strategy).toBe(baseResult.strategy);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('adding creativity-only quests does not change discipline stat', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 52 }),
        (progress) => {
          const noQuestResult = computeAllStats([], defaultAxisConfigs, [], TODAY);

          const creativityQuests = [{
            id: 'q-creativity-sketchbook',
            axis: 'creativity',
            currentValue: progress,
            targetValue: 52,
            done: progress >= 52,
          }];

          const withQuestResult = computeAllStats([], defaultAxisConfigs, creativityQuests, TODAY);

          // Discipline has no quests, so it should be unchanged
          expect(withQuestResult.discipline).toBe(noQuestResult.discipline);
          expect(withQuestResult.strength).toBe(noQuestResult.strength);
          expect(withQuestResult.knowledge).toBe(noQuestResult.knowledge);
          expect(withQuestResult.wisdom).toBe(noQuestResult.wisdom);
          expect(withQuestResult.strategy).toBe(noQuestResult.strategy);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('axis stats are computed independently — each axis uses only its own logs and quests', () => {
    // More general: generate logs for one random axis, verify all others are unaffected vs baseline
    fc.assert(
      fc.property(
        fc.constantFrom(...AXES),
        fc.integer({ min: 1, max: 10 }),
        (targetAxis, count) => {
          const baseline = computeAllStats([], defaultAxisConfigs, [], TODAY);

          const axisLogs = Array.from({ length: count }, (_, i) => ({
            id: crypto.randomUUID(),
            date: daysAgo(i),
            type: 'daily_checkbox',
            axis: targetAxis,
          }));

          const result = computeAllStats(axisLogs, defaultAxisConfigs, [], TODAY);

          for (const axis of AXES) {
            if (axis !== targetAxis) {
              expect(result[axis]).toBe(baseline[axis]);
            }
          }
        }
      ),
      { numRuns: 300 }
    );
  });
});
