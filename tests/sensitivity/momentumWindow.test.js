/**
 * tests/sensitivity/momentumWindow.test.js
 */
import { describe, it, expect } from 'vitest';
import { createIdealUser } from '../../simulations/personas/idealUser.js';
import { subDays } from '../../simulations/generators/dateUtils.js';

// We reimplement countInRange here to test alternative windows without modifying the engine
function countInRange(logs, startDate, endDate) {
  return logs.filter(
    l => l.type !== 'onboarding_assessment' && l.type !== 'proof_check_in' && l.date >= startDate && l.date <= endDate
  ).length;
}

function calcAltMomentum(axisLogs, today, windowDays) {
  const recentStart = subDays(today, windowDays - 1);
  const priorEnd = subDays(today, windowDays);
  const priorStart = subDays(today, windowDays * 2 - 1);

  const recentRate = countInRange(axisLogs, recentStart, today);
  const priorRate = countInRange(axisLogs, priorStart, priorEnd);

  const raw = ((recentRate - priorRate) / Math.max(priorRate, 1)) * 100;
  return Math.min(Math.max(raw, -20), 20);
}

describe('Experiment 5: Momentum Window Sensitivity', () => {
  const TODAY = '2026-09-15';

  it('computes momentum under different window sizes', () => {
    const ideal = createIdealUser(TODAY, 90);
    const cLogs = ideal.logs.filter(l => l.axis === 'creativity');
    
    const m7 = calcAltMomentum(cLogs, TODAY, 7);
    const m14 = calcAltMomentum(cLogs, TODAY, 14);
    const m30 = calcAltMomentum(cLogs, TODAY, 30);

    expect(m14).toBeDefined(); // Just verifying it runs
  });
});
