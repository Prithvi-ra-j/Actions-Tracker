// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '../../src/App.jsx';
import { initDB } from '../../src/database/db.js';
import { markOnboardingComplete } from '../../src/database/selfModelRepository.js';

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
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    Element.prototype.getBoundingClientRect = vi.fn(() => (
      { width: 120, height: 120, top: 0, left: 0, bottom: 0, right: 0 }
    ));
  });

  afterEach(() => {
    cleanup(); // vitest globals are off, so RTL will not auto-clean between tests
    vi.restoreAllMocks();
  });

  it('renders onboarding and allows to start interview', async () => {
    render(<App />);
    expect(await screen.findByText(/Let us build your system/i)).toBeTruthy();
    fireEvent.click(screen.getByText('Start interview'));
    expect(await screen.findByPlaceholderText(/Ask Jarvis/i)).toBeTruthy();
  });

  it('skips onboarding if data exists and renders tabs', async () => {
    await markOnboardingComplete();
    render(<App />);
    await waitForApp();
    expect(screen.getByText('Goals')).toBeTruthy();
    fireEvent.click(screen.getByText('Goals'));
    expect(await screen.findByText(/active goals/i)).toBeTruthy();
  });

  it('can navigate to the Stats tab (empty state on a fresh DB)', async () => {
    await markOnboardingComplete();
    render(<App />);
    fireEvent.click(await waitForApp());
    expect(await screen.findByText(/Not enough evidence/i)).toBeTruthy();
  });

  it('can open Jarvis from the docked pill', async () => {
    await markOnboardingComplete();
    render(<App />);
    await waitForApp();
    const jarvisButtons = await screen.findAllByRole('button', { name: /Ask Jarvis/i });
    fireEvent.click(jarvisButtons[jarvisButtons.length - 1]);
    expect(await screen.findByPlaceholderText(/Ask Jarvis/i)).toBeTruthy();
  });
});
