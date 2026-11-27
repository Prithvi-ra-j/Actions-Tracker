// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('../../src/database/backupService.js', () => ({
  restoreLatestBackupIfDatabaseEmpty: vi.fn().mockResolvedValue({ restored: false, reason: 'no_valid_backup' }),
  runAutoBackup: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('../../src/native/notifications.js', () => ({
  scheduleAllReminders: vi.fn(),
  requestNotificationPermission: vi.fn(),
}));
vi.mock('../../src/core/updateChecker.js', () => ({ checkForUpdate: vi.fn().mockResolvedValue(null) }));
vi.mock('../../src/core/ai/analysisScheduler.js', () => ({ bootstrapAnalysisScheduler: vi.fn() }));

import App from '../../src/App.jsx';
import { clearAllDatabaseData, closeDB, initDB } from '../../src/database/db.js';
import { getAllHabits } from '../../src/database/habitRepository.js';
import { clearSecureValue, setSecureValue } from '../../src/native/secureStorage.js';
import { getReminders, getSetting } from '../../src/database/settingsRepository.js';
import { requestNotificationPermission, scheduleAllReminders } from '../../src/native/notifications.js';

async function finishOnboarding() {
  fireEvent.click(await screen.findByRole('button', { name: 'Get started' }, { timeout: 15000 }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByLabelText(/Take a 10-minute walk/));
  fireEvent.click(screen.getByLabelText(/Stretch for five minutes/));
  fireEvent.change(screen.getByLabelText('Add your own habit (optional)'), { target: { value: 'Walk outside' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Go to Today' }));
  await screen.findByText('Walk outside', {}, { timeout: 15000 });
}

describe('manual habits', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
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

  it('creates and completes a daily habit without configuring Ved', async () => {
    render(<App />);
    await finishOnboarding();

    const row = (await screen.findByText('Walk outside')).parentElement.parentElement;
    expect(screen.queryByRole('region', { name: 'Habit reminder' })).toBeNull();
    expect(await getAllHabits()).toEqual([expect.objectContaining({
      name: 'Walk outside', domain: 'body', frequency: { type: 'daily' }, source: { type: 'user' },
    })]);
    fireEvent.click(within(row).getByRole('checkbox'));
    await waitFor(() => expect(within(row).getByRole('checkbox').getAttribute('aria-checked')).toBe('true'));
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    await waitFor(async () => expect(await getSetting('firstHabitReminderPrompt')).toBe('done'));
    expect(requestNotificationPermission).not.toHaveBeenCalled();

    cleanup();
    render(<App />);
    const restoredRow = (await screen.findByText('Walk outside', {}, { timeout: 15000 })).parentElement.parentElement;
    expect(within(restoredRow).getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByRole('region', { name: 'Habit reminder' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add habit' }));
    fireEvent.change(screen.getByLabelText('Habit name'), { target: { value: 'Read' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create habit' }));
    expect(await screen.findByText('Read')).toBeTruthy();
    expect(await getAllHabits()).toHaveLength(2);
  }, 30000);

  it('offers manual goals and explains audit setup without an AI connection', async () => {
    render(<App />);
    await finishOnboarding();
    fireEvent.click(await screen.findByRole('button', { name: 'Goals' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Create a goal' }, { timeout: 15000 }));
    expect(screen.getByRole('dialog', { name: 'New goal' })).toBeTruthy();
    expect(screen.getByLabelText('Goal outcome').closest('.goal-fields')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Audits' }));
    expect(await screen.findByText(/Audits need an AI connection/, {}, { timeout: 15000 })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Run Audit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Domain' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Set up Ved' }));
    expect(await screen.findByRole('heading', { name: 'Connect Ved' }, { timeout: 15000 })).toBeTruthy();
  }, 30000);

  it('asks permission only after completion and enables the selected reminder', async () => {
    requestNotificationPermission.mockResolvedValue(true);
    render(<App />);
    await finishOnboarding();
    expect(requestNotificationPermission).not.toHaveBeenCalled();
    const row = screen.getByText('Walk outside').parentElement.parentElement;
    fireEvent.click(within(row).getByRole('checkbox'));
    fireEvent.click(await screen.findByRole('button', { name: 'Enable reminder' }));
    await waitFor(async () => expect(await getSetting('firstHabitReminderPrompt')).toBe('done'));
    expect(requestNotificationPermission).toHaveBeenCalledTimes(1);
    expect(await getReminders()).toEqual([expect.objectContaining({ id: 4, time: '08:00', enabled: true })]);
    expect(scheduleAllReminders).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 4, enabled: true })],
      expect.any(Object), false, { strict: true }
    );
  }, 30000);

  it('keeps the reminder disabled when notification permission is denied', async () => {
    requestNotificationPermission.mockResolvedValue(false);
    render(<App />);
    await finishOnboarding();
    const row = screen.getByText('Walk outside').parentElement.parentElement;
    fireEvent.click(within(row).getByRole('checkbox'));
    fireEvent.click(await screen.findByRole('button', { name: 'Enable reminder' }));
    expect((await screen.findByRole('alert')).textContent).toContain('permission was not granted');
    expect((await getReminders())[0].enabled).toBe(false);
    expect(await getSetting('firstHabitReminderPrompt')).toBe('pending');
  }, 30000);

  it('reveals Ved actions after a connection is added in Settings', async () => {
    render(<App />);
    await finishOnboarding();
    expect(screen.queryByRole('button', { name: 'Ask Ved' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));
    await screen.findByText('AI & Provider');
    await setSecureValue('aiApiKey', 'synthetic-key');
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(await screen.findByRole('button', { name: 'Ask Ved' }, { timeout: 15000 })).toBeTruthy();
  }, 30000);

});
