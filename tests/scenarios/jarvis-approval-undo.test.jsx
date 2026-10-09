// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import JarvisTab from '../../src/components/JarvisTab.jsx';
import { closeDB, initDB } from '../../src/database/db.js';
import { getConversation } from '../../src/database/jarvisConversationRepository.js';
import { getHabit } from '../../src/database/habitRepository.js';
import { addLog } from '../../src/database/logsRepository.js';
import { clearSecureValue, setSecureValue } from '../../src/native/secureStorage.js';

const DATABASE_NAME = 'actions-tracker';

async function clearDatabase() {
  closeDB();
  const databases = await indexedDB.databases();
  for (const database of databases) {
    if (database.name !== DATABASE_NAME) continue;
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DATABASE_NAME);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Test database deletion was blocked.'));
    });
  }
}

describe('Jarvis proposal approval and undo journey', () => {
  beforeEach(async () => {
    await clearDatabase();
    localStorage.setItem('actions_tracker_fresh_start_2026_09_26', '1');
    await initDB();
    await addLog({
      axis: 'knowledge',
      type: 'manual_evidence',
      value: 1,
      date: '2026-10-02',
      meta: { content: 'Test lab readiness fixture' },
    });
    await clearSecureValue('aiApiKey');
    await setSecureValue('aiApiKey', 'test-api-key');
  });

  afterEach(async () => {
    cleanup();
    await clearSecureValue('aiApiKey');
    closeDB();
  });

  it('requires explicit review, persists the approved change, and restores it on undo', async () => {
    const findText = text => screen.findByText(text, {}, { timeout: 30_000 });
    const findRole = (role, options) => screen.findByRole(role, options, { timeout: 30_000 });
    const jarvisEngine = await import('../../src/core/ai/jarvisEngine.js');
    vi.spyOn(jarvisEngine, 'chatWithJarvis').mockResolvedValue({
      message: 'I can add a short daily reading habit.',
      claims: [],
      contextUsed: [],
      proposal: {
        id: 'proposal-undo-journey',
        actionType: 'add_habit',
        name: 'Read for ten minutes',
        payload: {
          id: 'habit-undo-journey',
          name: 'Read for ten minutes',
          domain: 'knowledge',
          frequency: { type: 'daily' },
        },
        impact: {
          affectedDomains: ['knowledge'],
          scoringImpact: 'Adds practice evidence over time.',
          routineImpact: 'Adds a short daily activity.',
          identityAlignment: 'Supports consistent learning.',
          disciplineImpact: 'Builds a repeatable practice.',
          risks: [],
          dependencies: [],
        },
        reasoning: 'The user asked for a small, repeatable reading habit.',
        confidence: 0.9,
      },
    });
    render(<JarvisTab />);

    expect(await findText('Recent activity')).toBeTruthy();
    const composer = await findRole(
      'combobox',
      { name: 'Tell Jarvis what you want' }
    );
    fireEvent.change(composer, { target: { value: 'Create a daily reading habit.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await findText('I can add a short daily reading habit.')).toBeTruthy();
    fireEvent.click(await findRole('button', { name: 'Review' }));
    expect(await findRole('heading', { name: 'What will change' })).toBeTruthy();
    expect(await getHabit('habit-undo-journey')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await findText('Changes applied')).toBeTruthy();
    expect(await getHabit('habit-undo-journey')).toMatchObject({
      id: 'habit-undo-journey',
      name: 'Read for ten minutes',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await findText('Changes undone. Your prior state was restored.')).toBeTruthy();
    expect((await getHabit('habit-undo-journey')).status).toBe('archived');
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    expect((await getConversation('jarvis_default')).messages.at(-1).proposalStatus).toBe('undone');
  }, 60_000);
});
