import { describe, expect, it } from 'vitest';
import { calculateCapacity, findRoutineConflicts } from '../../src/core/routineEngine.js';

describe('routineEngine', () => {
  it('counts recurring days in weekly capacity', () => {
    const result = calculateCapacity({
      weeklyBudget: { total: 2, unit: 'hours' },
      timeSlots: [{ habitId: 'h1', day: [2, 4], duration: 30 }],
      constraints: [],
    }, []);

    expect(result.usedHours).toBe(1);
    expect(result.freeHours).toBe(1);
    expect(result.overcommitted).toBe(false);
  });

  it('detects slot and constraint conflicts', () => {
    const conflicts = findRoutineConflicts([
      { habitId: 'h1', day: [4], startTime: '20:00', duration: 30 },
      { habitId: 'h2', day: [4], startTime: '20:15', duration: 30 },
    ], [{ type: 'sleep', days: [4], startTime: '20:20', endTime: '21:00' }]);

    expect(conflicts).toEqual(expect.arrayContaining([
      { type: 'slot_overlap', first: 'h1', second: 'h2' },
      { type: 'constraint_overlap', slot: 'h1', constraint: 'sleep' },
      { type: 'constraint_overlap', slot: 'h2', constraint: 'sleep' },
    ]));
  });
});
