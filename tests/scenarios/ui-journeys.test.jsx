// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '../../src/App.jsx';
import JarvisTab from '../../src/components/JarvisTab.jsx';
import { clearSecureValue, setSecureValue } from '../../src/native/secureStorage.js';
import { initDB } from '../../src/database/db.js';
import { addLog } from '../../src/database/logsRepository.js';

// Wait until the bootstrap finished and the loading splash is gone.
async function waitForApp() {
  // The tab bar only exists once dbReady is true.
  return screen.findByText('Stats');
}

describe('UI Journeys', () => {
  beforeEach(async () => {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      indexedDB.deleteDatabase(db.name);
    }
    await initDB();
    await clearSecureValue('aiApiKey');
    await setSecureValue('aiApiKey', 'test-api-key');
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    Element.prototype.getBoundingClientRect = vi.fn(() => (
      { width: 120, height: 120, top: 0, left: 0, bottom: 0, right: 0 }
    ));
  });

  afterEach(() => {
    cleanup(); // vitest globals are off, so RTL will not auto-clean between tests
    vi.restoreAllMocks();
  });

  it('shows API setup before the Jarvis workspace when no key is configured', async () => {
    await clearSecureValue('aiApiKey');
    render(<JarvisTab />);
    expect(await screen.findByText(/Connect Jarvis/i)).toBeTruthy();
    expect(screen.getByLabelText('Jarvis API key')).toBeTruthy();
  });

  it('starts first-run onboarding at Jarvis API setup', async () => {
    await clearSecureValue('aiApiKey');
    render(<App />);
    expect(await screen.findByText(/Connect Jarvis/i)).toBeTruthy();
    expect(screen.getByLabelText('Jarvis API key')).toBeTruthy();
  });

  it('uses the empty database as the first-run state', async () => {
    render(<App />);
    expect(await screen.findByLabelText('Jarvis onboarding')).toBeTruthy();
  });

  it('opens the normal app when user data already exists', async () => {
    await addLog({
      axis: 'body',
      type: 'manual_evidence',
      value: 1,
      date: '2026-09-25',
    });
    render(<App />);
    await waitForApp();
    expect(screen.getByText('Goals')).toBeTruthy();
    fireEvent.click(screen.getByText('Goals'));
    expect(await screen.findByText(/^\d+\s+active$/i)).toBeTruthy();
  });

  it('can navigate to the Stats tab when user data exists', async () => {
    await addLog({
      axis: 'body',
      type: 'manual_evidence',
      value: 1,
      date: '2026-09-25',
    });
    render(<App />);
    fireEvent.click(await waitForApp());
    expect(await screen.findByText('Stats')).toBeTruthy();
  });

  it('can open normal Jarvis from the docked pill', async () => {
    await addLog({
      axis: 'body',
      type: 'manual_evidence',
      value: 1,
      date: '2026-09-25',
    });
    render(<App />);
    await waitForApp();
    const dockedJarvisBtn = document.getElementById('jarvis-pill-btn');
    expect(dockedJarvisBtn).toBeTruthy();
    fireEvent.click(dockedJarvisBtn);
    expect(await screen.findByPlaceholderText(/Tell Jarvis what you want/i)).toBeTruthy();
  });
});
