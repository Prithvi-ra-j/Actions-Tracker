/**
 * tests/migration/v1_migration.test.js
 * 
 * Verifies that historical logs (from Model v0.1/v0.2) migrate gracefully 
 * to Model v1.0 without loss of progress or erratic stat changes.
 */

import { describe, it, expect } from 'vitest';
import { deriveQuestValue } from '../../src/database/questBoardRepository.js';

describe('Migration: Model v0.1 -> Model v1.0', () => {

  it('migrates historical Social journal_entry logs gracefully', () => {
    // In v0.1, a user logged 'journal_entry' for Social, which counted as 1 entry.
    // In v1.0, the same exact 'journal_entry' should seamlessly map to 1 evidence point.
    
    const historicalLogs = [
      { id: '1', type: 'journal_entry', axis: 'social', date: '2025-01-01' },
      { id: '2', type: 'journal_entry', axis: 'social', date: '2025-01-02' },
      { id: '3', type: 'journal_entry', axis: 'social', date: '2025-01-03' }
    ];

    // The new quest replaces the old 'q-social-meditations'
    const newQuest = { id: 'q-social-journal', axis: 'social', targetValue: 75 };
    
    const progress = deriveQuestValue(newQuest, historicalLogs);
    
    // 3 old journal entries should seamlessly become 3 evidence points
    expect(progress).toBe(3);
  });

  it('migrates historical Strategy book_finished logs gracefully', () => {
    // In v0.1, a user logged 'book_finished' to complete two duplicate quests.
    // In v1.0, those logs map seamlessly to the new continuous reading quest.
    
    const historicalLogs = [
      { id: '1', type: 'book_finished', axis: 'strategy', date: '2025-01-01' }, // No weight meta
      { id: '2', type: 'book_finished', axis: 'strategy', date: '2025-01-15' }  // No weight meta
    ];

    const newQuest = { id: 'q-strategy-reading', axis: 'strategy', targetValue: 4 };

    const progress = deriveQuestValue(newQuest, historicalLogs);
    
    // 2 old books should seamlessly become 2.0 progress (no metadata needed)
    expect(progress).toBe(2);
  });

});
