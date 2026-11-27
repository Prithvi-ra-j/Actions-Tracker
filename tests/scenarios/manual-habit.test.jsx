// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('../../src/database/backupService.js', () => ({
  restoreLatestBackupIfDatabaseEmpty: vi.fn().mockResolvedValue({ restored: false, reason: 'no_valid_backup' }),
  runAutoBackup: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('../../src/native/notifications.js', () => ({ scheduleAllReminders: vi.fn() }));
vi.mock('../../src/core/updateChecker.js', () => ({ checkForUpdate: vi.fn().mockResolvedValue(null) }));

import App from '../../src/App.jsx';
import { clearAllDatabaseData, closeDB, initDB } from '../../src/database/db.js';
import { getAllHabits } from '../../src/database/habitRepository.js';
import { clearSecureValue } from '../../src/native/secureStorage.js';

describe('manual habits', () => {
  beforeEach(async () => {
    closeDB();
    await initDB();
    await clearAllDatabaseData();
    localStorage.clear();
    await clearSecureValue('aiApiKey');
    Element.prototype.getBoundingClientRect = vi.fn(() => (
      { width: 120, height: 120, top: 0, left: 0, bottom: 0, right: 0 }
    ));
  });

  afterEach(() => {
    cleanup();
  });

  it('creates and completes a daily habit without configuring Jarvis', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Continue without Jarvis' }, { timeout: 15000 }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add habit' }, { timeout: 15000 }));
    fireEvent.change(screen.getByLabelText('Habit name'), { target: { value: '  Walk outside  ' } });
    fireEvent.change(screen.getByLabelText('Habit axis'), { target: { value: 'body' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create habit' }));

    const row = (await screen.findByText('Walk outside')).parentElement.parentElement;
    expect(await getAllHabits()).toEqual([expect.objectContaining({
      name: 'Walk outside', domain: 'body', frequency: { type: 'daily' }, source: { type: 'user' },
    })]);
    fireEvent.click(within(row).getByRole('checkbox'));
    await waitFor(() => expect(within(row).getByRole('checkbox').getAttribute('aria-checked')).toBe('true'));

    cleanup();
    render(<App />);
    const restoredRow = (await screen.findByText('Walk outside', {}, { timeout: 15000 })).parentElement.parentElement;
    expect(within(restoredRow).getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Add habit' }));
    fireEvent.change(screen.getByLabelText('Habit name'), { target: { value: 'Read' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create habit' }));
    expect(await screen.findByText('Read')).toBeTruthy();
    expect(await getAllHabits()).toHaveLength(2);
  }, 30000);

});
