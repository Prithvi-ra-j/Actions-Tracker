/**
 * tests/properties/monotonicity.test.js
 *
 * Property: adding more valid activity should not decrease Volume
 * (Volume is non-decreasing with respect to quest progress).
 *
 * Also tests: adding logs to a window should not decrease Consistency.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calcVolume, calcConsistency, calcMomentum } from '../../src/helpers/statsEngine.js';

const TODAY = '2025-06-15';

function daysAgo(n) {
  const d = new Date(TODAY + 'T00:00:00');
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const arbQuest = fc.record({
  id:           fc.string({ minLength: 1, maxLength: 10 }),
  axis:         fc.constant('discipline'),
  currentValue: fc.integer({ min: 0, max: 90 }),
  targetValue:  fc.integer({ min: 1, max: 90 }),
  done:         fc.boolean(),
});

describe('Volume monotonicity', () => {
  it('increasing quest currentValue (up to target) does not decrease Volume', () => {
    fc.assert(
      fc.property(
        arbQuest,
        fc.integer({ min: 0, max: 50 }),
        (q, increment) => {
          const v1 = calcVolume([q]);
          const qIncremented = { ...q, currentValue: Math.min(q.currentValue + increment, q.targetValue) };
          const v2 = calcVolume([qIncremented]);
          expect(v2).toBeGreaterThanOrEqual(v1 - 0.001); // allow floating point epsilon
        }
      ),
      { numRuns: 500 }
    );
  });

  it('marking a quest as done never decreases Volume', () => {
    fc.assert(
      fc.property(arbQuest, (q) => {
        const vBefore = calcVolume([q]);
        const vAfter  = calcVolume([{ ...q, done: true }]);
        // done=true forces progress=1.0, so result should be >= non-done
        expect(vAfter).toBeGreaterThanOrEqual(vBefore - 0.001);
      }),
      { numRuns: 300 }
    );
  });
});

describe('Consistency monotonicity', () => {
  const config = { hasConsistencyTerm: true, expectedPerWeek: 7, paused: false };

  it('adding a real log to the window does not decrease Consistency', () => {
    // Generate a base set of logs, compute C, add one more log in the window, compute C again
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 0, max: 29 }).map(n => ({
            id: crypto.randomUUID(),
            date: daysAgo(n),
            type: 'daily_checkbox',
            axis: 'discipline',
          })),
          { maxLength: 20 }
        ),
        fc.integer({ min: 0, max: 29 }),
        (logs, daysBack) => {
          const c1 = calcConsistency('discipline', logs, config, TODAY);

          const extraLog = {
            id:   crypto.randomUUID(),
            date: daysAgo(daysBack),
            type: 'daily_checkbox',
            axis: 'discipline',
          };
          const c2 = calcConsistency('discipline', [...logs, extraLog], config, TODAY);

          // Both are in [0, 100]; adding an in-window log can only hold or increase C
          // (since completed++ while expected stays the same)
          expect(c2).toBeGreaterThanOrEqual(c1 - 0.001);
        }
      ),
      { numRuns: 300 }
    );
  });
});

describe('Momentum: more activity in recent window than prior increases M', () => {
  it('adding logs only to recent window increases Momentum vs baseline', () => {
    // Baseline: equal activity in both windows
    const recentLogs = Array.from({ length: 5 }, (_, i) => ({
      id: crypto.randomUUID(), date: daysAgo(i), type: 'gym_session', axis: 'strength',
    }));
    const priorLogs = Array.from({ length: 5 }, (_, i) => ({
      id: crypto.randomUUID(), date: daysAgo(14 + i), type: 'gym_session', axis: 'strength',
    }));

    const mBase = calcMomentum('strength', [...recentLogs, ...priorLogs], {}, TODAY);

    // Add one more recent log
    const extraRecent = { id: crypto.randomUUID(), date: daysAgo(3), type: 'gym_session', axis: 'strength' };
    const mMore = calcMomentum('strength', [...recentLogs, ...priorLogs, extraRecent], {}, TODAY);

    expect(mMore).toBeGreaterThanOrEqual(mBase);
  });
});
