/**
 * tests/scenarios/ideal-user.test.js
 *
 * Scenario: A user who does everything correctly, every day, for 90 days.
 *
 * Expected behavior:
 *   - All stats should be significantly elevated (not near 0)
 *   - Consistency should be near 100 for all active axes
 *   - Volume should reflect quest progress
 *   - Momentum should be near 0 (stable, not improving/declining)
 *   - All values in [0, 99]
 *   - No NaN/Infinity
 */

import { describe, it, expect } from 'vitest';
import { computeAllStats, computeAxisDetails } from '../../src/helpers/statsEngine.js';

// ── Simulate 90 days of ideal behavior ───────────────────────────────────────

const TODAY = '2025-06-15';

function daysAgo(n) {
  const d = new Date(TODAY + 'T00:00:00');
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function log(date, axis, type = 'daily_checkbox') {
  return { id: crypto.randomUUID(), date, axis, type };
}

// 90 days of activity for every axis
function buildIdealLogs() {
  const logs = [];
  for (let i = 0; i < 90; i++) {
    const date = daysAgo(i);
    // Body: gym 4x/week (every Mon/Wed/Fri/Sat → ~4/7 days)
    if (i % 2 === 0) logs.push(log(date, 'body', 'gym_session'));
    // Discipline: daily body checkbox
    logs.push(log(date, 'discipline', 'daily_checkbox'));
    // Knowledge: daily reading
    logs.push(log(date, 'knowledge', 'book_pages'));
    // Social: journal entry every week (~13 total)
    if (i % 7 === 0) logs.push(log(date, 'social', 'journal_entry'));
    // Creativity: weekly sketch session
    if (i % 7 === 0) logs.push(log(date, 'creativity', 'daily_checkbox'));
    // Strategy: reading every day (when not paused)
    logs.push(log(date, 'strategy', 'book_pages'));
  }
  return logs;
}

// Quest progress reflecting 90 days of ideal behavior
const IDEAL_QUESTS = [
  { id: 'q-body-sessions',   axis: 'body',   currentValue: 45,  targetValue: 90,  done: false },
  { id: 'q-body-benchmark',  axis: 'body',   currentValue: 0,   targetValue: 1,   done: false },
  { id: 'q-discipline-days',     axis: 'discipline', currentValue: 90,  targetValue: 90,  done: true  },
  { id: 'q-knowledge-books',     axis: 'knowledge',  currentValue: 3,   targetValue: 6,   done: false },
  { id: 'q-knowledge-commonplace', axis: 'knowledge', currentValue: 20, targetValue: 40,  done: false },
  { id: 'q-social-meditations',  axis: 'social',     currentValue: 5,   targetValue: 10,  done: false },
  { id: 'q-creativity-sketchbook', axis: 'creativity', currentValue: 13, targetValue: 52, done: false },
  { id: 'q-creativity-masters',  axis: 'creativity', currentValue: 1,   targetValue: 4,   done: false },
  { id: 'q-creativity-piece',    axis: 'creativity', currentValue: 0,   targetValue: 1,   done: false },
  { id: 'q-strategy-biography',  axis: 'strategy',   currentValue: 0,   targetValue: 1,   done: false },
  { id: 'q-strategy-48laws',     axis: 'strategy',   currentValue: 0,   targetValue: 1,   done: false },
];

const IDEAL_AXIS_CONFIGS = [
  { axis: 'body',   expectedPerWeek: 4,    paused: false, hasConsistencyTerm: true },
  { axis: 'discipline', expectedPerWeek: 7,    paused: false, hasConsistencyTerm: true },
  { axis: 'knowledge',  expectedPerWeek: 7,    paused: false, hasConsistencyTerm: true },
  { axis: 'social',     expectedPerWeek: null, paused: false, hasConsistencyTerm: false },
  { axis: 'creativity', expectedPerWeek: 1,    paused: false, hasConsistencyTerm: true },
  { axis: 'strategy',   expectedPerWeek: 7,    paused: false, hasConsistencyTerm: true },
];

const idealLogs   = buildIdealLogs();
const allStats    = computeAllStats(idealLogs, IDEAL_AXIS_CONFIGS, IDEAL_QUESTS, TODAY);
const allDetails  = computeAxisDetails(idealLogs, IDEAL_AXIS_CONFIGS, IDEAL_QUESTS, TODAY);

// ── Assertions ────────────────────────────────────────────────────────────────

describe('Ideal user scenario', () => {
  it('all stats are in [0, 99]', () => {
    for (const [axis, val] of Object.entries(allStats)) {
      expect(val, `${axis} out of bounds`).toBeGreaterThanOrEqual(0);
      expect(val, `${axis} out of bounds`).toBeLessThanOrEqual(99);
      expect(Number.isFinite(val), `${axis} is not finite`).toBe(true);
    }
  });

  it('discipline stat is elevated (daily activity)', () => {
    // Discipline should be high: daily logs + quest completed
    expect(allStats.discipline).toBeGreaterThan(30);
  });

  it('knowledge stat is elevated (daily reading)', () => {
    expect(allStats.knowledge).toBeGreaterThan(20);
  });

  it('body stat is elevated (4x/week training)', () => {
    expect(allStats.body).toBeGreaterThan(20);
  });

  it('social stat is non-zero (weekly journaling)', () => {
    expect(allStats.social).toBeGreaterThan(0);
  });

  it('creativity stat is non-zero (weekly sketching)', () => {
    expect(allStats.creativity).toBeGreaterThan(0);
  });

  it('discipline Consistency is near 100 (daily activity)', () => {
    const { C } = allDetails.discipline;
    expect(C).toBeGreaterThan(80);
  });

  it('knowledge Consistency is near 100 (daily reading)', () => {
    const { C } = allDetails.knowledge;
    expect(C).toBeGreaterThan(80);
  });

  it('social C is null (Social has no Consistency term)', () => {
    expect(allDetails.social.C).toBeNull();
  });

  it('discipline Volume is 100 (quest completed)', () => {
    expect(allDetails.discipline.V).toBe(100);
  });

  it('momentum is moderate (stable behavior, not a sprint or crash)', () => {
    // 90 days of consistent activity → recent ≈ prior → M ≈ 0
    // Allow some deviation since days-ago boundary can cause slight imbalance
    for (const axis of ['discipline', 'knowledge']) {
      const { M } = allDetails[axis];
      expect(M).toBeGreaterThanOrEqual(-20);
      expect(M).toBeLessThanOrEqual(20);
    }
  });
});
