/**
 * tests/sensitivity/strategyPause.test.js
 */
import { describe, it, expect } from 'vitest';
import { createStrategyReader } from '../../simulations/personas/strategyReader.js';
import { calcMomentum } from '../../src/helpers/statsEngine.js';

describe('Experiment 7: Strategy Pause & Momentum', () => {
  const TODAY = '2026-09-15';

  it('demonstrates Momentum decay during a pause', () => {
    // Read for 30 days, finish book. Then 42 days (6 weeks) gap.
    // So activity ended 42 days ago.
    // Recent 14 window: 0. Prior 14 window: 0.
    // M should be 0 because both are 0. Wait, if it decays, it goes negative, then back to 0.
    
    // Let's create a persona that stopped 14 days ago.
    const stopped = createStrategyReader(TODAY, 30, false);
    // Offset all their logs by 14 days into the past
    const offsetLogs = stopped.logs.map(l => {
      const d = new Date(l.date + 'T00:00:00');
      d.setDate(d.getDate() - 14);
      return { ...l, date: d.toISOString().slice(0,10) }; // Mocking offset
    });

    const m = calcMomentum('strategy', offsetLogs, stopped.axisConfigs[0], TODAY);
    
    // Recent (0-13 days ago) = 0. Prior (14-27 days ago) = 14 logs.
    // M should be strongly negative because paused=false (in the middle of a book).
    expect(m).toBeLessThan(0);
  });

  it('demonstrates Momentum freezes when paused', () => {
    // Finished the book 14 days ago
    const finished = createStrategyReader(TODAY, 30, true);
    
    // Offset all logs by 14 days into the past
    const offsetLogs = finished.logs.map(l => {
      const d = new Date(l.date + 'T00:00:00');
      d.setDate(d.getDate() - 14);
      return { ...l, date: d.toISOString().slice(0,10) };
    });

    // We manually set paused: true on the config
    const config = { ...finished.axisConfigs[0], paused: true };

    const m = calcMomentum('strategy', offsetLogs, config, TODAY);
    
    // It should freeze at the date of book_finished (14 days ago).
    // The 14 days before book_finished had full reading activity.
    // Therefore M should be 0 (steady) or positive (growing to finish), but definitely not negative.
    expect(m).toBeGreaterThanOrEqual(0);
  });
});
