/**
 * tests/migration/v1_evidence_preservation.test.js
 * 
 * Validates Phase 7B: Historical Integrity.
 * Migration may reinterpret evidence under Model v1.0, but it must not silently
 * manufacture, delete, duplicate, or rewrite evidence.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { migrateFromLocalStorage } from '../../src/database/migration.js';
import * as logsRepo from '../../src/database/logsRepository.js';
import * as settingsRepo from '../../src/database/settingsRepository.js';

describe('Phase 7B: Evidence Preservation', () => {
  let addLogSpy;
  let getSettingSpy;
  let setSettingSpy;

  beforeEach(() => {
    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn()
    };

    // Spy on DB methods
    addLogSpy = vi.spyOn(logsRepo, 'addLog').mockResolvedValue('mock-id');
    getSettingSpy = vi.spyOn(settingsRepo, 'getSetting').mockResolvedValue(null);
    setSettingSpy = vi.spyOn(settingsRepo, 'setSetting').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete global.localStorage;
  });

  it('migrates legacy daily records into exact canonical logs without data loss or duplication', async () => {
    // 1. Setup raw v0.1 local storage state
    // Suppose the user had 3 days of daily records.
    // Day 1: 2 tasks done.
    // Day 2: 1 task done.
    // Day 3: 4 tasks done.
    // Total historical logs should be exactly 7.
    const legacyDaily = {
      "2025-01-01": { body: true, philosophy: true, art: false, history: false },
      "2025-01-02": { body: false, philosophy: false, art: true, history: false },
      "2025-01-03": { body: true, philosophy: true, art: true, history: true }
    };

    global.localStorage.getItem.mockImplementation((key) => {
      if (key === 'yearEndGoals.daily') return JSON.stringify(legacyDaily);
      return null;
    });

    // 2. Run Migration
    await migrateFromLocalStorage();

    // 3. Verify exactly 7 logs were manufactured (Evidence Preservation)
    expect(addLogSpy).toHaveBeenCalledTimes(7);

    // 4. Verify exact schema translation for each event
    // Day 1 - body
    expect(addLogSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'daily_checkbox',
      axis: 'discipline',
      date: '2025-01-01',
      meta: { task: 'body' }
    }));

    // Day 1 - philosophy
    expect(addLogSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'daily_checkbox',
      axis: 'knowledge',
      date: '2025-01-01',
      meta: { task: 'philosophy' }
    }));

    // Day 3 - history
    expect(addLogSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'daily_checkbox',
      axis: 'strategy',
      date: '2025-01-03',
      meta: { task: 'history' }
    }));
    
    // Day 3 - art
    expect(addLogSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'daily_checkbox',
      axis: 'creativity',
      date: '2025-01-03',
      meta: { task: 'art' }
    }));

    // 5. Verify the flag is set so it doesn't duplicate
    expect(setSettingSpy).toHaveBeenCalledWith('migrated_from_localStorage', '1');
  });

  it('idempotency: does not duplicate evidence if run twice', async () => {
    // If the flag is set, it should not do anything.
    getSettingSpy.mockResolvedValueOnce('1');
    await migrateFromLocalStorage();
    expect(addLogSpy).toHaveBeenCalledTimes(0);
  });
});
