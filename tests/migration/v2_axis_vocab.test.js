import { describe, it, expect, vi, beforeEach } from 'vitest';
import { migrateAxisVocabulary } from '../../src/database/migration.js';
import * as db from '../../src/database/db.js';
import * as settingsRepo from '../../src/database/settingsRepository.js';

describe('v2_axis_vocab migration', () => {
  let mockDB = {};

  beforeEach(() => {
    mockDB = {
      logs: [],
      questBoard: [],
      axis_config: []
    };

    vi.spyOn(settingsRepo, 'getSetting').mockResolvedValue('0');
    vi.spyOn(settingsRepo, 'setSetting').mockResolvedValue();

    vi.spyOn(db, 'dbGetAll').mockImplementation(async (store) => {
      return mockDB[store] || [];
    });

    vi.spyOn(db, 'dbPut').mockImplementation(async (store, record) => {
      const idKey = store === 'axis_config' ? 'axis' : 'id';
      mockDB[store] = mockDB[store].filter(item => item[idKey] !== record[idKey]);
      mockDB[store].push(record);
    });

    vi.spyOn(db, 'dbDelete').mockImplementation(async (store, key) => {
      const idKey = store === 'axis_config' ? 'axis' : 'id';
      mockDB[store] = mockDB[store].filter(item => item[idKey] !== key);
    });
  });

  it('migrates strength->body and wisdom->strategy in logs, questBoard, and axis_config', async () => {
    mockDB.logs = [
      { id: 'l1', axis: 'strength', type: 'gym_session' },
      { id: 'l2', axis: 'wisdom', type: 'journal_entry' },
      { id: 'l3', axis: 'knowledge', type: 'book_finished' }
    ];

    mockDB.questBoard = [
      { id: 'q-strength-sessions', axis: 'strength', title: 'Train' },
      { id: 'q-wisdom-journal', axis: 'wisdom', title: 'Journal' },
      { id: 'q-knowledge-books', axis: 'knowledge', title: 'Read' }
    ];

    mockDB.axis_config = [
      { axis: 'strength', expectedPerWeek: 4 },
      { axis: 'wisdom', expectedPerWeek: null },
      { axis: 'knowledge', expectedPerWeek: 7 }
    ];

    await migrateAxisVocabulary();

    expect(mockDB.logs.find(l => l.id === 'l1').axis).toBe('body');
    expect(mockDB.logs.find(l => l.id === 'l2').axis).toBe('strategy');
    
    expect(mockDB.questBoard.find(q => q.id === 'q-body-sessions').axis).toBe('body');
    expect(mockDB.questBoard.find(q => q.id === 'q-strategy-journal').axis).toBe('strategy');
    
    expect(mockDB.axis_config.find(c => c.axis === 'body')).toBeDefined();
    expect(mockDB.axis_config.find(c => c.axis === 'strategy')).toBeDefined();
    
    expect(settingsRepo.setSetting).toHaveBeenCalledWith('migrated_axis_vocab_v2', '1');
  });

  it('is idempotent and safely skips if already run', async () => {
    vi.spyOn(settingsRepo, 'getSetting').mockResolvedValue('1');
    mockDB.logs = [{ id: 'l1', axis: 'strength', type: 'gym_session' }];
    
    await migrateAxisVocabulary();

    expect(mockDB.logs.find(l => l.id === 'l1').axis).toBe('strength');
    expect(db.dbPut).not.toHaveBeenCalled();
  });
});
