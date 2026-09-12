/**
 * tests/adversarial/strategyDiscontinuity.test.js
 */
import { describe, it, expect } from 'vitest';
import { createStrategyReader } from '../../simulations/personas/strategyReader.js';
import { computeAxisDetails } from '../../src/helpers/statsEngine.js';

describe('Experiment 1: Strategy Discontinuity', () => {
  const TODAY = '2026-09-15';

  it('verifies V is 0 before book finishes and 100 after', () => {
    const unfinished = createStrategyReader(TODAY, 30, false);
    const finished = createStrategyReader(TODAY, 30, true);

    const resUn = computeAxisDetails(unfinished.logs, unfinished.axisConfigs, unfinished.quests, TODAY).strategy;
    const resFin = computeAxisDetails(finished.logs, finished.axisConfigs, finished.quests, TODAY).strategy;

    expect(resUn.V).toBe(0);
    expect(resFin.V).toBe(100);
    
    const jump = resFin.stat - resUn.stat;
    expect(jump).toBeCloseTo(40, -1); // V=100 with wV=0.40 -> ~40 point jump
  });
});
