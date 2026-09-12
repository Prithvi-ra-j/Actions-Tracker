/**
 * tests/adversarial/questDuplication.test.js
 */
import { describe, it, expect } from 'vitest';
import { createStrategyQuestsSimulation } from '../../simulations/personas/strategyReader.js';
import { computeAxisDetails } from '../../src/helpers/statsEngine.js';

describe('Experiment 2: Strategy Quest Duplication', () => {
  const TODAY = '2026-09-15';

  it('demonstrates that 1 book yields 100% Volume under current model', () => {
    const sim = createStrategyQuestsSimulation(TODAY, 1);
    
    const vCurrent = computeAxisDetails(sim.logs, sim.axisConfigs, sim.currentQuests, TODAY).strategy.V;
    expect(vCurrent).toBe(100);

    const vOptionA = computeAxisDetails(sim.logs, sim.axisConfigs, sim.optionAQuests, TODAY).strategy.V;
    expect(vOptionA).toBe(100); // 1 out of 1 quests done
  });
});
