// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('../../src/database/backupService.js', () => ({
  restoreLatestBackupIfDatabaseEmpty: vi.fn().mockResolvedValue({ restored: false, reason: 'database_not_empty' }),
  runAutoBackup: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('../../src/native/notifications.js', () => ({ scheduleAllReminders: vi.fn() }));
vi.mock('../../src/core/updateChecker.js', () => ({ checkForUpdate: vi.fn().mockResolvedValue(null) }));

import App from '../../src/App.jsx';
import { clearAllDatabaseData, dbGetAll, dbPut, exportDatabase, initDB } from '../../src/database/db.js';
import { addHabit } from '../../src/database/habitRepository.js';
import { getRegisteredConnectors, runAllSyncs } from '../../src/core/sync/syncManager.js';
import { clearSecureValue } from '../../src/native/secureStorage.js';

afterEach(cleanup);

describe('food and fitness placeholder', () => {
  it('removes external sync while preserving previously imported data', async () => {
    await initDB();
    await clearAllDatabaseData();
    await clearSecureValue('aiApiKey');
    const projection = { id: 'legacy-projection', sourceApp: 'nutrilift', payload: { value: 42 } };
    const fact = { id: 'legacy-fact', type: 'body.measurement', source: { type: 'integration', integrationId: 'nutrilift' } };
    await dbPut('nutriLiftProjections', projection);
    await dbPut('facts', fact);
    await addHabit({ name: 'Existing habit', frequency: { type: 'daily' } });

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open Settings' }, { timeout: 15000 }));
    fireEvent.click(await screen.findByRole('button', { name: /Integrations/ }));
    expect(screen.getByText('Health Connect')).toBeTruthy();
    expect(screen.queryByText(/NutriLift/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: /Food & Fitness/ }));
    expect(screen.getByRole('heading', { name: 'Food & Fitness' })).toBeTruthy();
    expect(screen.getByText('Work in progress')).toBeTruthy();
    expect(screen.getByText(/Food logging and analysis/).textContent).toContain('not available yet');
    expect(screen.queryByText(/NutriLift/i)).toBeNull();
    expect(getRegisteredConnectors().map(connector => connector.id)).toEqual(['health-connect']);

    await runAllSyncs();
    expect(await dbGetAll('nutriLiftProjections')).toEqual([projection]);
    expect(await dbGetAll('facts')).toEqual([fact]);
    const backup = JSON.parse(await exportDatabase());
    expect(backup.nutriLiftProjections).toEqual([projection]);
    expect(backup.facts).toEqual([fact]);
  }, 30000);
});
