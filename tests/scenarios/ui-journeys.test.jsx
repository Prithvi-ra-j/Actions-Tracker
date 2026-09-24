// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App.jsx';
import { initDB } from '../../src/database/db.js';

describe('UI Journeys', () => {
  beforeEach(async () => {
    // Clear databases if needed
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      indexedDB.deleteDatabase(db.name);
    }
    await initDB();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  it('renders onboarding and allows to start interview', async () => {
    // Wait for initial DB setup
    render(<App />);
    
    // Welcome screen should appear if database is empty
    expect(await screen.findByText(/Let us build your system/i)).toBeTruthy();
    
    // Start interview
    fireEvent.click(screen.getByText('Start interview'));
    
    // Jarvis should be visible
    expect(await screen.findByPlaceholderText(/Ask Jarvis/i)).toBeTruthy();
  });
});
