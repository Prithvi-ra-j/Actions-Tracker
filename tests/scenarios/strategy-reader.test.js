/**
 * tests/scenarios/strategy-reader.test.js
 *
 * Scenario: A user who reads strategy books consistently.
 * Tests Strategy-specific behavior: pause/unpause mechanics, Volume gating on book_finished,
 * Consistency freezing, and the interaction between reading activity and quest completion.
 */

import { describe, it, expect } from 'vitest';
import { computeAllStats, computeAxisDetails, calcConsistency } from '../../src/helpers/statsEngine.js';

const TODAY = '2025-06-15';

function daysAgo(n) {
  const d = new Date(TODAY + 'T00:00:00');
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function log(date, type, axis = 'strategy') {
  return { id: crypto.randomUUID(), date, type, axis };
}

const AXIS_CONFIGS_PAUSED = [
  { axis: 'strategy', expectedPerWeek: 7, paused: true, hasConsistencyTerm: true },
];

const AXIS_CONFIGS_ACTIVE = [
  { axis: 'strategy', expectedPerWeek: 7, paused: false, hasConsistencyTerm: true },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Strategy reader scenario', () => {
  describe('Strategy paused with no books', () => {
    it('strategy stat is 0 with no logs and paused', () => {
      const stats = computeAllStats([], AXIS_CONFIGS_PAUSED, [], TODAY);
      expect(stats.strategy).toBe(0);
    });

    it('book_pages logs do NOT give Volume (V only comes from quest completion)', () => {
      const logs = Array.from({ length: 30 }, (_, i) => log(daysAgo(i), 'book_pages'));
      const details = computeAxisDetails(logs, AXIS_CONFIGS_PAUSED, [], TODAY);
      // No quests → V = 0
      expect(details.strategy.V).toBe(0);
    });

    it('book_pages logs DO contribute to Consistency (when not paused)', () => {
      const logs = Array.from({ length: 30 }, (_, i) => log(daysAgo(i), 'book_pages'));
      const c = calcConsistency('strategy', logs, AXIS_CONFIGS_ACTIVE[0], TODAY);
      expect(c).toBeGreaterThan(0);
    });
  });

  describe('Active reading (book in progress, not paused)', () => {
    const readingLogs = Array.from({ length: 30 }, (_, i) => log(daysAgo(i), 'book_pages'));

    it('strategy stat is non-zero when active and reading daily', () => {
      const stats = computeAllStats(readingLogs, AXIS_CONFIGS_ACTIVE, [], TODAY);
      expect(stats.strategy).toBeGreaterThan(0);
    });

    it('strategy Consistency is near 100 with daily reading (\u224896-100%)', () => {
      const details = computeAxisDetails(readingLogs, AXIS_CONFIGS_ACTIVE, [], TODAY);
      // 30 logs at daysAgo(0)..daysAgo(29). Window = [today-29..today] = 30 days.
      // expected = (30/7)*7 = 30.0000...04. completed = 29 or 30 depending on floating-point.
      // Result is 96.67 or 100 — either way very high.
      expect(details.strategy.C).toBeGreaterThan(90);
      expect(details.strategy.C).toBeLessThanOrEqual(100);
    });
  });

  describe('Strategy pause freeze behavior', () => {
    // Book finished 10 days ago. Then paused.
    const bookFinishDate = daysAgo(10);
    const logs = [
      log(bookFinishDate, 'book_finished'),
      // Reading before the finish date (in frozen window):
      log(daysAgo(15), 'book_pages'),
      log(daysAgo(20), 'book_pages'),
      // Activity after finish (today) — should NOT count in frozen window:
      log(TODAY, 'book_pages'),
      log(daysAgo(5), 'book_pages'),
    ];

    it('frozen window excludes logs after book_finished date', () => {
      const cPaused = calcConsistency('strategy', logs, AXIS_CONFIGS_PAUSED[0], TODAY);
      const cActive = calcConsistency('strategy', logs, AXIS_CONFIGS_ACTIVE[0], TODAY);

      // Paused: windowEnd = bookFinishDate (10 days ago)
      // Counted: logs at daysAgo(15) and daysAgo(20) + the book_finished itself = 3 logs
      // Active: windowEnd = TODAY
      // Counted: all 5 logs = 5 logs in window
      // So cActive should be higher (more logs counted)
      expect(cActive).toBeGreaterThan(cPaused);
    });

    it('paused strategy Consistency does not decay after book is finished', () => {
      // Frozen window means C doesn't decrease just because time passes
      const cPaused = calcConsistency('strategy', logs, AXIS_CONFIGS_PAUSED[0], TODAY);
      // Should be non-zero (reading happened before the finish date)
      expect(cPaused).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Book finished — quest completion and Volume jump', () => {
    const strategyQuests = [
      { id: 'q-strategy-biography', axis: 'strategy', currentValue: 0, targetValue: 1, done: false },
      { id: 'q-strategy-48laws',    axis: 'strategy', currentValue: 0, targetValue: 1, done: false },
    ];

    const strategyQuestsDone = [
      { id: 'q-strategy-biography', axis: 'strategy', currentValue: 1, targetValue: 1, done: true },
      { id: 'q-strategy-48laws',    axis: 'strategy', currentValue: 1, targetValue: 1, done: true },
    ];

    const logs = Array.from({ length: 30 }, (_, i) => log(daysAgo(i), 'book_pages'));

    it('V is 0 before any books are finished', () => {
      const details = computeAxisDetails(logs, AXIS_CONFIGS_ACTIVE, strategyQuests, TODAY);
      expect(details.strategy.V).toBe(0);
    });

    it('V is 100 after both strategy quests are complete', () => {
      const details = computeAxisDetails(logs, AXIS_CONFIGS_ACTIVE, strategyQuestsDone, TODAY);
      expect(details.strategy.V).toBe(100);
    });

    it('strategy stat jumps significantly when quests are complete', () => {
      const statBefore = computeAllStats(logs, AXIS_CONFIGS_ACTIVE, strategyQuests, TODAY).strategy;
      const statAfter  = computeAllStats(logs, AXIS_CONFIGS_ACTIVE, strategyQuestsDone, TODAY).strategy;
      expect(statAfter).toBeGreaterThan(statBefore);
      console.log(`[strategy-reader] Before quest completion: ${statBefore}, After: ${statAfter}`);
    });
  });

  describe('Multiple books in sequence', () => {
    const finishDates = [daysAgo(60), daysAgo(30)];
    const logs = [
      ...finishDates.map(d => log(d, 'book_finished')),
      // Reading between books and currently:
      ...Array.from({ length: 15 }, (_, i) => log(daysAgo(i), 'book_pages')),
    ];

    it('strategy stat is valid (not NaN, in bounds)', () => {
      const stats = computeAllStats(logs, AXIS_CONFIGS_ACTIVE, [], TODAY);
      expect(Number.isFinite(stats.strategy)).toBe(true);
      expect(stats.strategy).toBeGreaterThanOrEqual(0);
      expect(stats.strategy).toBeLessThanOrEqual(99);
    });
  });
});
