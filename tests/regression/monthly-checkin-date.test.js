// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import App from '../../src/App.jsx';
import { closeDB, initDB } from '../../src/database/db.js';
import { addLog } from '../../src/database/logsRepository.js';
import * as dateHelpers from '../../src/helpers/dateHelpers.js';
import { clearSecureValue, setSecureValue } from '../../src/native/secureStorage.js';

vi.spyOn(dateHelpers, 'localDateStr').mockReturnValue('2026-09-27');

describe('Monthly check-in date validation regression', () => {
  beforeEach(async () => {
    closeDB();
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name !== 'actions-tracker') continue;
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(db.name);
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error(`Database deletion blocked: ${db.name}`));
      });
    }
    await initDB();
    await clearSecureValue('aiApiKey');
    await setSecureValue('aiApiKey', 'test-api-key');
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 120, height: 120, top: 0, left: 0, bottom: 120, right: 120,
    }));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('rejects invalid dates and does not show check-in if valid data is <30 days old', async () => {
    await addLog({ type: 'manual_evidence', date: '2026-09-15', value: 1 });
    
    await addLog({ type: 'manual_evidence', date: '2026/08/26', value: 1 });
    await addLog({ type: 'manual_evidence', date: '26-08-2026', value: 1 });
    await addLog({ type: 'manual_evidence', date: 'foo', value: 1 });

    render(<App />);
    
    await screen.findByRole('tab', { name: 'Stats' }, { timeout: 15000 });
    
    expect(screen.queryByText(/Monthly Check-In/i)).toBeNull();
  });

  it('shows check-in if valid data is 31+ days old', async () => {
    await addLog({ type: 'manual_evidence', date: '2026-08-26', value: 1 });
    
    render(<App />);
    
    expect(await screen.findByText(/Monthly Check-In/i, {}, { timeout: 15000 })).toBeTruthy();
  });

  it('verifies explicit date format matching (regression tests)', () => {
    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
    
    expect(DATE_REGEX.test('2026-09-26')).toBe(true);
    expect(DATE_REGEX.test('2026-01-01')).toBe(true);
    expect(DATE_REGEX.test('2026-12-31')).toBe(true);

    expect(DATE_REGEX.test('2026/09/26')).toBe(false);
    expect(DATE_REGEX.test('26-09-2026')).toBe(false);
    expect(DATE_REGEX.test('foo')).toBe(false);
  });
});
