/**
 * tests/unit/momentum.test.js
 *
 * Unit tests for calcMomentum() — the Momentum (M) component.
 *
 * Formula:
 *   recent14  = count(logs, today−13 .. today)
 *   prior14   = count(logs, today−27 .. today−14)
 *   raw = (recentRate − priorRate) / max(priorRate, 1) × 100
 *   M   = clamp(raw, −20, +20)
 *
 * Source: src/helpers/statsEngine.js
 */

import { describe, it, expect } from 'vitest';
import { calcMomentum } from '../../src/helpers/statsEngine.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = '2025-06-15';

/**
 * Creates a minimal log entry for the given date.
 * All types except onboarding_assessment and proof_check_in count.
 */
function log(date, type = 'gym_session') {
  return { id: crypto.randomUUID(), date, type, axis: 'body' };
}

/**
 * Produces n log entries spread across a date range [start, end] (inclusive).
 * Distributes them evenly enough for testing.
 */
function logsOnDate(dateStr, n = 1) {
  return Array.from({ length: n }, () => log(dateStr));
}

/**
 * Returns a YYYY-MM-DD string for `n` days before the given date string.
 */
/**
 * Returns a 'YYYY-MM-DD' string for `n` days before today, using LOCAL time.
 * Must match the engine's subDays() which also uses local Date methods.
 */
function daysAgo(n, from = TODAY) {
  const d = new Date(from + 'T00:00:00');
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('calcMomentum', () => {
  it('returns 0 for completely empty log array', () => {
    // priorRate = 0, recent = 0 → raw = (0−0)/1 × 100 = 0
    expect(calcMomentum('body', [], {}, TODAY)).toBe(0);
  });

  it('returns positive momentum when recent activity exceeds prior', () => {
    const logs = [
      ...logsOnDate(daysAgo(0)),    // today — in recent window
      ...logsOnDate(daysAgo(7)),    // 7 days ago — in recent window
      // prior window (14–27 days ago): nothing
    ];
    const m = calcMomentum('body', logs, {}, TODAY);
    expect(m).toBeGreaterThan(0);
  });

  it('returns negative momentum when recent activity is less than prior', () => {
    const logs = [
      // recent window (0–13 days ago): nothing
      ...logsOnDate(daysAgo(14)),   // 14 days ago — in prior window
      ...logsOnDate(daysAgo(20)),   // 20 days ago — in prior window
    ];
    const m = calcMomentum('body', logs, {}, TODAY);
    expect(m).toBeLessThan(0);
  });

  it('returns 0 when recent and prior activity are equal', () => {
    const logs = [
      ...logsOnDate(daysAgo(5)),    // recent
      ...logsOnDate(daysAgo(20)),   // prior
    ];
    // recentRate = 1, priorRate = 1 → raw = (1−1)/1 × 100 = 0
    expect(calcMomentum('body', logs, {}, TODAY)).toBe(0);
  });

  it('clamps large positive momentum to +20', () => {
    // 10 recent, 0 prior → raw = (10 − 0) / 1 × 100 = 1000 → clamped to 20
    const logs = Array.from({ length: 10 }, (_, i) => log(daysAgo(i)));
    const m = calcMomentum('body', logs, {}, TODAY);
    expect(m).toBe(20);
  });

  it('clamps large negative momentum to −20', () => {
    // 0 recent, 10 prior → raw = (0 − 10) / 10 × 100 = −100 → clamped to −20
    const logs = Array.from({ length: 10 }, (_, i) => log(daysAgo(14 + i)));
    const m = calcMomentum('body', logs, {}, TODAY);
    expect(m).toBe(-20);
  });

  it('always returns a value in [−20, +20]', () => {
    const m1 = calcMomentum('body', [], {}, TODAY);
    const m2 = calcMomentum('body', Array.from({ length: 100 }, () => log(TODAY)), {}, TODAY);
    expect(m1).toBeGreaterThanOrEqual(-20);
    expect(m1).toBeLessThanOrEqual(20);
    expect(m2).toBeGreaterThanOrEqual(-20);
    expect(m2).toBeLessThanOrEqual(20);
  });

  it('excludes onboarding_assessment logs from count', () => {
    const logsWithOnboarding = [
      { ...log(daysAgo(0)), type: 'onboarding_assessment' },
      { ...log(daysAgo(1)), type: 'onboarding_assessment' },
    ];
    // These should not count — result should be same as empty
    expect(calcMomentum('body', logsWithOnboarding, {}, TODAY)).toBe(0);
  });

  it('excludes proof_check_in logs from count', () => {
    const logsWithCheckin = [
      { ...log(daysAgo(0)), type: 'proof_check_in' },
    ];
    expect(calcMomentum('body', logsWithCheckin, {}, TODAY)).toBe(0);
  });

  it('uses today (day 0) as inclusive in the recent window', () => {
    const logs = [log(TODAY)]; // exactly today
    const m = calcMomentum('body', logs, {}, TODAY);
    expect(m).toBeGreaterThan(0); // recent=1, prior=0 → positive
  });

  it('uses today−13 as the INCLUSIVE start of the recent window (recent14Start = subDays(today,13))', () => {
    // recent14Start = subDays(today, 13) = today-13
    // recentRate counts [today-13..today] — so a log at today-13 goes into RECENT window
    // prior14End   = subDays(today, 14) = today-14
    // A log at today-13 is NOT in prior window (prior ends at today-14)
    // recentRate=1, priorRate=0 → raw=(1-0)/1*100=100 → M=+20
    const logs = [log(daysAgo(13))]; // exactly today-13
    const m = calcMomentum('body', logs, {}, TODAY);
    expect(m).toBeGreaterThan(0); // in recent window → positive momentum
  });

  it('uses today−14 as the INCLUSIVE end of the prior window (prior14End = subDays(today,14))', () => {
    // prior14End   = subDays(today, 14) = today-14
    // A log at today-14 goes into PRIOR window (not recent)
    // recent14Start = subDays(today, 13), so today-14 is outside recent window
    // recentRate=0, priorRate=1 → raw=(0-1)/1*100=-100 → M=-20
    const logs = [log(daysAgo(14))]; // exactly today-14
    const m = calcMomentum('body', logs, {}, TODAY);
    expect(m).toBeLessThan(0); // in prior window → negative momentum
  });

  it('treats today−27 as the earliest day of the prior window', () => {
    // prior14Start = subDays(today, 27) = today-27
    // countInRange uses >=, so today-27 is the last included day of prior window
    const logs = [log(daysAgo(27))]; // exactly today-27
    const m = calcMomentum('body', logs, {}, TODAY);
    // recentRate=0, priorRate=1 → M=-20
    expect(m).toBeLessThan(0); // in prior window
  });

  it('ignores logs older than 27 days', () => {
    const logs = [log(daysAgo(28))]; // outside both windows
    // Both windows empty → M = 0
    expect(calcMomentum('body', logs, {}, TODAY)).toBe(0);
  });

  it('is deterministic — same inputs always produce same output', () => {
    const logs = [log(daysAgo(3)), log(daysAgo(10)), log(daysAgo(18))];
    const res1 = calcMomentum('test', logs, {}, '2026-09-15');
    const res2 = calcMomentum('test', logs, {}, '2026-09-15');
    expect(res1).toBe(res2);
  });
});
