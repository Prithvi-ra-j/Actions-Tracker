/**
 * tests/properties/bounds.test.js
 *
 * Property-based tests verifying that all stats stay within [0, 99]
 * for any generated input. Uses fast-check for automated input generation.
 *
 * Invariants under test:
 *   1. calcVolume()       → [0, 100]
 *   2. calcMomentum()     → [−20, +20]
 *   3. calcConsistency()  → [0, 100] or null
 *   4. calcAxisStat()     → [0, 99]
 *   5. computeAllStats()  → all values in [0, 99]
 *   6. No NaN, Infinity, or undefined anywhere
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

// ── Arbitraries ───────────────────────────────────────────────────────────────

const AXES = ['body', 'discipline', 'knowledge', 'social', 'creativity', 'strategy'];
const LOG_TYPES = ['gym_session', 'daily_checkbox', 'book_pages', 'book_finished', 'journal_entry'];

const arbDateStr = fc.integer({ min: 0, max: 364 }).map(n => {
  const d = new Date('2025-01-01T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
});

const arbLogType = fc.constantFrom(...LOG_TYPES);
const arbAxis    = fc.constantFrom(...AXES);

const arbLog = fc.record({
  id:   fc.uuid(),
  date: arbDateStr,
  type: arbLogType,
  axis: arbAxis,
});

const arbLogs = fc.array(arbLog, { maxLength: 100 });

const arbQuest = fc.record({
  id:           fc.string({ minLength: 1, maxLength: 20 }),
  axis:         arbAxis,
  currentValue: fc.integer({ min: 0, max: 200 }),
  targetValue:  fc.integer({ min: 1, max: 200 }),
  done:         fc.boolean(),
});

const arbQuests = fc.array(arbQuest, { maxLength: 20 });

const arbAxisConfig = fc.record({
  hasConsistencyTerm: fc.boolean(),
  expectedPerWeek:    fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 14 })),
  paused:             fc.boolean(),
});

// ── Volume bounds ─────────────────────────────────────────────────────────────

describe('calcVolume — bounds property', () => {
  it('always returns a value in [0, 100]', () => {
    fc.assert(
      fc.property(arbQuests, (quests) => {
        const v = calcVolume(quests);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
        expect(Number.isFinite(v)).toBe(true);
      }),
      { numRuns: 500 }
    );
  });
});

// ── Momentum bounds ───────────────────────────────────────────────────────────

describe('calcMomentum — bounds property', () => {
  it('always returns a value in [−20, +20]', () => {
    fc.assert(
      fc.property(arbLogs, arbDateStr, (logs, today) => {
        const m = calcMomentum('body', logs, {}, today);
        expect(m).toBeGreaterThanOrEqual(-20);
        expect(m).toBeLessThanOrEqual(20);
        expect(Number.isFinite(m)).toBe(true);
      }),
      { numRuns: 500 }
    );
  });
});

// ── Consistency bounds ────────────────────────────────────────────────────────

describe('calcConsistency — bounds property', () => {
  it('returns null or a value in [0, 100]', () => {
    fc.assert(
      fc.property(arbAxis, arbLogs, arbAxisConfig, arbDateStr, (axis, logs, config, today) => {
        const c = calcConsistency(axis, logs, config, today);
        if (c === null) {
          // Allowed — only when hasConsistencyTerm=false or no expectedPerWeek
          return;
        }
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(100);
        expect(Number.isFinite(c)).toBe(true);
      }),
      { numRuns: 500 }
    );
  });
});

// ── calcAxisStat bounds ───────────────────────────────────────────────────────

describe('calcAxisStat — bounds property', () => {
  it('always returns a value in [0, 99] for any generated inputs', () => {
    fc.assert(
      fc.property(
        arbAxis,
        arbLogs,
        arbAxisConfig,
        arbQuests,
        arbDateStr,
        (axis, logs, config, quests, today) => {
          const filteredLogs   = logs.filter(l => l.axis === axis);
          const filteredQuests = quests.filter(q => q.axis === axis);
          const stat = calcAxisStat(axis, filteredLogs, config, filteredQuests, today);
          expect(stat).toBeGreaterThanOrEqual(0);
          expect(stat).toBeLessThanOrEqual(99);
          expect(Number.isFinite(stat)).toBe(true);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('never produces NaN', () => {
    fc.assert(
      fc.property(
        arbAxis, arbLogs, arbAxisConfig, arbQuests, arbDateStr,
        (axis, logs, config, quests, today) => {
          const filteredLogs   = logs.filter(l => l.axis === axis);
          const filteredQuests = quests.filter(q => q.axis === axis);
          const stat = calcAxisStat(axis, filteredLogs, config, filteredQuests, today);
          expect(Number.isNaN(stat)).toBe(false);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('never produces Infinity', () => {
    fc.assert(
      fc.property(
        arbAxis, arbLogs, arbAxisConfig, arbQuests, arbDateStr,
        (axis, logs, config, quests, today) => {
          const filteredLogs   = logs.filter(l => l.axis === axis);
          const filteredQuests = quests.filter(q => q.axis === axis);
          const stat = calcAxisStat(axis, filteredLogs, config, filteredQuests, today);
          expect(Number.isFinite(stat)).toBe(true);
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ── computeAllStats bounds ────────────────────────────────────────────────────

describe('computeAllStats — bounds property', () => {
  const arbAllAxisConfigs = fc.array(
    fc.record({
      axis:               arbAxis,
      hasConsistencyTerm: fc.boolean(),
      expectedPerWeek:    fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 14 })),
      paused:             fc.boolean(),
    }),
    { minLength: 0, maxLength: 6 }
  );

  it('all axes stay in [0, 99] for any generated data', () => {
    fc.assert(
      fc.property(arbLogs, arbAllAxisConfigs, arbQuests, arbDateStr, (logs, configs, quests, today) => {
        const result = computeAllStats(logs, configs, quests, today);
        for (const axis of AXES) {
          const val = result[axis];
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThanOrEqual(99);
          expect(Number.isFinite(val)).toBe(true);
          expect(Number.isNaN(val)).toBe(false);
        }
      }),
      { numRuns: 300 }
    );
  });
});
