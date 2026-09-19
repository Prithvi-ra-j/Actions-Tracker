/**
 * tests/properties/determinism.test.js
 *
 * Property: same inputs → same outputs, always.
 * No hidden state, no date.now() inside the engine, no randomness.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calcVolume,
  calcMomentum,
  calcConsistency,
  calcAxisStat,
  computeAllStats,
} from '../../src/helpers/statsEngine.js';

const AXES = ['body', 'discipline', 'knowledge', 'social', 'creativity', 'strategy'];

const arbDateStr = fc.integer({ min: 0, max: 364 }).map(n => {
  const d = new Date('2025-01-01T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
});

const arbLog = fc.record({
  id:   fc.uuid(),
  date: arbDateStr,
  type: fc.constantFrom('gym_session', 'daily_checkbox', 'book_pages', 'journal_entry'),
  axis: fc.constantFrom(...AXES),
});

const arbLogs   = fc.array(arbLog, { maxLength: 50 });
const arbQuests = fc.array(fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  axis: fc.constantFrom(...AXES),
  currentValue: fc.integer({ min: 0, max: 100 }),
  targetValue:  fc.integer({ min: 1, max: 100 }),
  done: fc.boolean(),
}), { maxLength: 10 });

const arbAxisConfig = fc.record({
  hasConsistencyTerm: fc.boolean(),
  expectedPerWeek:    fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 14 })),
  paused:             fc.boolean(),
});

describe('determinism', () => {
  it('calcVolume returns the same value for identical inputs', () => {
    fc.assert(
      fc.property(arbQuests, (quests) => {
        expect(calcVolume(quests)).toBe(calcVolume(quests));
      }),
      { numRuns: 300 }
    );
  });

  it('calcMomentum returns the same value for identical inputs', () => {
    fc.assert(
      fc.property(arbLogs, arbDateStr, (logs, today) => {
        const m1 = calcMomentum('body', logs, {}, today);
        const m2 = calcMomentum('body', logs, {}, today);
        expect(m1).toBe(m2);
      }),
      { numRuns: 300 }
    );
  });

  it('calcConsistency returns the same value for identical inputs', () => {
    fc.assert(
      fc.property(fc.constantFrom(...AXES), arbLogs, arbAxisConfig, arbDateStr, (axis, logs, config, today) => {
        const r1 = calcConsistency(axis, logs, config, today);
        const r2 = calcConsistency(axis, logs, config, today);
        expect(r1).toBe(r2);
      }),
      { numRuns: 300 }
    );
  });

  it('calcAxisStat returns the same value for identical inputs', () => {
    fc.assert(
      fc.property(fc.constantFrom(...AXES), arbLogs, arbAxisConfig, arbQuests, arbDateStr,
        (axis, logs, config, quests, today) => {
          const fLogs   = logs.filter(l => l.axis === axis);
          const fQuests = quests.filter(q => q.axis === axis);
          const r1 = calcAxisStat(axis, fLogs, config, fQuests, today);
          const r2 = calcAxisStat(axis, fLogs, config, fQuests, today);
          expect(r1).toBe(r2);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('computeAllStats returns the same object for identical inputs', () => {
    fc.assert(
      fc.property(arbLogs, arbQuests, arbDateStr, (logs, quests, today) => {
        const r1 = computeAllStats(logs, [], quests, today);
        const r2 = computeAllStats(logs, [], quests, today);
        expect(r1).toEqual(r2);
      }),
      { numRuns: 200 }
    );
  });
});
