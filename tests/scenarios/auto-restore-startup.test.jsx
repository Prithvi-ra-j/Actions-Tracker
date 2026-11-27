// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const filesystem = vi.hoisted(() => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
  writeFile: vi.fn(),
  deleteFile: vi.fn(),
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: filesystem,
  Directory: { Documents: 'DOCUMENTS' },
  Encoding: { UTF8: 'utf8' },
}));
vi.mock('../../src/native/notifications.js', () => ({ scheduleAllReminders: vi.fn() }));
vi.mock('../../src/core/updateChecker.js', () => ({ checkForUpdate: vi.fn().mockResolvedValue(null) }));

import App from '../../src/App.jsx';
import { clearAllDatabaseData, closeDB, exportDatabase, initDB } from '../../src/database/db.js';
import { addHabit, getAllHabits } from '../../src/database/habitRepository.js';

describe('startup recovery after reinstall', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    closeDB();
    await initDB();
    await clearAllDatabaseData();
    localStorage.clear();
    filesystem.readdir.mockResolvedValue({ files: [] });
    filesystem.writeFile.mockResolvedValue({});
    Element.prototype.getBoundingClientRect = vi.fn(() => (
      { width: 120, height: 120, top: 0, left: 0, bottom: 0, right: 0 }
    ));
  });

  afterEach(() => {
    cleanup();
    closeDB();
  });

  it('restores a Documents backup before initialization without deleting it', async () => {
    await addHabit({ name: 'Recovered walk', frequency: { type: 'daily' } });
    const backup = await exportDatabase();
    await clearAllDatabaseData();
    filesystem.readFile.mockResolvedValue({ data: backup });

    render(<App />);
    expect(await screen.findByText('Recovered walk', {}, { timeout: 15000 })).toBeTruthy();
    expect((await getAllHabits()).some(habit => habit.name === 'Recovered walk')).toBe(true);
    expect(filesystem.deleteFile).not.toHaveBeenCalled();
    expect(filesystem.readFile.mock.invocationCallOrder[0]).toBeLessThan(filesystem.writeFile.mock.invocationCallOrder[0]);
  }, 30000);

  it('falls back to the newest dated backup when the latest file is missing', async () => {
    await addHabit({ name: 'Dated recovery', frequency: { type: 'daily' } });
    const backup = await exportDatabase();
    await clearAllDatabaseData();
    filesystem.readdir.mockResolvedValue({ files: [
      { name: 'ActionsTracker_Backup_2026-11-25.json' },
      { name: 'ActionsTracker_Backup_2026-11-26.json' },
    ] });
    filesystem.readFile.mockImplementation(async ({ path }) => {
      if (path === 'ActionsTracker_Backup_2026-11-26.json') return { data: backup };
      throw new Error('File does not exist');
    });

    render(<App />);
    expect(await screen.findByText('Dated recovery', {}, { timeout: 15000 })).toBeTruthy();
    expect(filesystem.readFile.mock.calls.map(([args]) => args.path)).toEqual([
      'ActionsTracker_Latest_Backup.json', 'ActionsTracker_Backup_2026-11-26.json',
    ]);
    expect(filesystem.deleteFile).not.toHaveBeenCalled();
  }, 30000);

  it('does not replace existing data when the reset marker is missing', async () => {
    await addHabit({ name: 'Existing habit', frequency: { type: 'daily' } });
    render(<App />);
    expect(await screen.findByText('Existing habit', {}, { timeout: 15000 })).toBeTruthy();
    expect(filesystem.readFile).not.toHaveBeenCalled();
    expect(filesystem.deleteFile).not.toHaveBeenCalled();
    expect((await getAllHabits()).some(habit => habit.name === 'Existing habit')).toBe(true);
  }, 30000);
});
