// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import App from '../../src/App.jsx';
import JarvisTab from '../../src/components/JarvisTab.jsx';
import { clearSecureValue, getSecureValue, setSecureValue } from '../../src/native/secureStorage.js';
import { closeDB, initDB } from '../../src/database/db.js';
import { getSetting } from '../../src/database/settingsRepository.js';
import { addLog, getAllLogs } from '../../src/database/logsRepository.js';
import { getAllGoals } from '../../src/database/goalsRepository.js';
import { addLearning, getAllLearnings } from '../../src/database/learningRepository.js';
import { addAudit, getLatestAudit } from '../../src/database/auditRepository.js';
import { saveConversation } from '../../src/database/jarvisConversationRepository.js';

// Wait until the bootstrap finished and the loading splash is gone.
async function waitForApp() {
  // The tab bar only exists once dbReady is true.
  return screen.findByRole('tab', { name: 'Stats' }, { timeout: 15000 });
}

describe('UI Journeys', () => {
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
    expect(await screen.findByRole('heading', { name: 'Stats' })).toBeTruthy();
  });

  it('saves Today evidence to IndexedDB with its selected axis and type', async () => {
    await addLog({
      axis: 'body',
      type: 'manual_evidence',
      value: 1,
      date: '2026-09-26',
    });
    render(<App />);
    await waitForApp();
    fireEvent.click(screen.getByRole('button', { name: 'Log evidence' }));
    fireEvent.change(screen.getByPlaceholderText('What did you do? What did you notice?'), {
      target: { value: 'Ran 5 km and felt strong.' },
    });
    fireEvent.change(screen.getByLabelText('Evidence type'), { target: { value: 'result' } });
    fireEvent.change(screen.getByLabelText('Evidence axis'), { target: { value: 'discipline' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save evidence' }));

    await waitFor(async () => {
      const logs = await getAllLogs();
      expect(logs.some(log => (
        log.type === 'manual_evidence' &&
        log.axis === 'discipline' &&
        log.meta?.content === 'Ran 5 km and felt strong.' &&
        log.meta?.evidenceType === 'result'
      ))).toBe(true);
    });
  });

  it('creates a goal from the Goals form and persists its milestones', async () => {
    await addLog({ axis: 'body', type: 'manual_evidence', value: 1, date: '2026-09-26' });
    render(<App />);
    fireEvent.click(await waitForApp());
    fireEvent.click(screen.getByText('Goals'));
    fireEvent.click(screen.getByRole('button', { name: 'New goal' }));
    fireEvent.change(screen.getByLabelText('Goal outcome'), { target: { value: 'Run a 10K' } });
    fireEvent.change(screen.getByLabelText('Goal axis'), { target: { value: 'body' } });
    fireEvent.change(screen.getByLabelText('Goal starting point'), { target: { value: '5 km with stops' } });
    fireEvent.change(screen.getByLabelText('Goal desired outcome'), { target: { value: '10 km continuously' } });
    fireEvent.change(screen.getByLabelText('Goal proof'), { target: { value: 'Complete a 10 km run' } });
    fireEvent.change(screen.getByLabelText('Goal milestones'), { target: { value: 'Run 7 km\nRun 8 km' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create goal' }));

    await waitFor(async () => {
      const goals = await getAllGoals();
      expect(goals.find(goal => goal.label === 'Run a 10K')?.targets).toEqual([
        { text: 'Run 7 km', metric: '', completed: false },
        { text: 'Run 8 km', metric: '', completed: false },
      ]);
    });

    fireEvent.click(await screen.findByText('Run a 10K'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit goal' }));
    fireEvent.change(screen.getByLabelText('Edit goal outcome'), { target: { value: 'Run a fast 10K' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save goal' }));
    await waitFor(async () => {
      expect((await getAllGoals()).some(goal => goal.label === 'Run a fast 10K')).toBe(true);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pause goal' }));
    await waitFor(async () => {
      expect((await getAllGoals()).find(goal => goal.label === 'Run a fast 10K')?.status).toBe('paused');
    });
  });

  it('logs Learn practice as evidence and advances the persisted loop step', async () => {
    await addLog({ axis: 'knowledge', type: 'manual_evidence', value: 1, date: '2026-09-26' });
    const learningId = await addLearning({
      concept: 'Reasoning practice',
      explanation: '',
      whyItMatters: 'Improve clear thinking',
      tags: ['Knowledge'],
    });
    render(<App />);
    await waitForApp();
    fireEvent.click(screen.getByRole('tab', { name: 'Learn' }));
    fireEvent.click(screen.getByText('Reasoning practice'));
    fireEvent.change(screen.getByLabelText('Practice note'), {
      target: { value: 'Applied the idea to a planning problem.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Log practice' }));

    await waitFor(async () => {
      const logs = await getAllLogs();
      const learnings = await getAllLearnings();
      expect(logs.some(log => (
        log.type === 'learning_practice' &&
        log.meta?.learningId === learningId &&
        log.meta?.content === 'Applied the idea to a planning problem.'
      ))).toBe(true);
      expect(learnings.find(item => item.id === learningId)?.loopStep).toBe('Apply');
    });
  });

  it('creates a Learn topic and persists its objective and axis', async () => {
    await addLog({ axis: 'knowledge', type: 'manual_evidence', value: 1, date: '2026-09-26' });
    render(<App />);
    await waitForApp();
    fireEvent.click(screen.getByRole('tab', { name: 'Learn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add topic' }));
    fireEvent.change(screen.getByLabelText('Learning topic'), { target: { value: 'Clear reasoning' } });
    fireEvent.change(screen.getByLabelText('Learning objective'), { target: { value: 'Explain arguments accurately' } });
    fireEvent.click(screen.getByRole('button', { name: 'Social' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save topic' }));

    await waitFor(async () => {
      const topics = await getAllLearnings();
      expect(topics.some(topic => (
        topic.concept === 'Clear reasoning' &&
        topic.whyItMatters === 'Explain arguments accurately' &&
        topic.tags?.[0] === 'Social' &&
        topic.loopStep === 'Learn'
      ))).toBe(true);
    });
  });

  it('attaches the selected goal when opening Jarvis from goal detail', async () => {
    await addLog({ axis: 'body', type: 'manual_evidence', value: 1, date: '2026-09-26' });
    const { addGoal } = await import('../../src/database/goalsRepository.js');
    await addGoal({ label: 'Run a 10K', domain: 'body', targets: [] });
    render(<App />);
    await waitForApp();
    fireEvent.click(screen.getByRole('tab', { name: 'Goals' }));
    fireEvent.click(await screen.findByText('Run a 10K'));
    fireEvent.click(screen.getByRole('button', { name: 'Ask about this goal' }));

    expect(await screen.findByText('Context: Run a 10K')).toBeTruthy();
  });

  it('opens a saved Jarvis conversation and starts a separate new chat', async () => {
    await addLog({ axis: 'body', type: 'manual_evidence', value: 1, date: '2026-09-26' });
    await saveConversation({
      id: 'jarvis_history_journey',
      title: 'Jarvis',
      createdAt: new Date().toISOString(),
      messages: [{ role: 'user', content: 'History journey question' }, { role: 'assistant', content: 'History journey answer' }],
    });
    render(<App />);
    await waitForApp();
    fireEvent.click(document.getElementById('jarvis-pill-btn'));
    fireEvent.click(await screen.findByRole('button', { name: 'Conversation history' }));
    fireEvent.click(await screen.findByRole('button', { name: /History journey question/ }));
    expect(await screen.findByText('History journey answer')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
    expect(await screen.findByText('What do you want to work on?')).toBeTruthy();
    expect(screen.queryByText('History journey answer')).toBeNull();
  });

  it('requires confirmation before importing a selected backup', async () => {
    await addLog({
      axis: 'body',
      type: 'manual_evidence',
      value: 1,
      date: '2026-09-26',
      meta: { content: 'Keep this local record' },
    });
    render(<App />);
    await waitForApp();
    fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));
    fireEvent.click(screen.getByText('Data'));
    fireEvent.change(screen.getByLabelText('Choose backup file'), {
      target: { files: [new File(['{}'], 'backup.json', { type: 'application/json' })] },
    });

    expect(screen.getByText(/Restore backup\.json\?/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect((await getAllLogs()).some(log => log.meta?.content === 'Keep this local record')).toBe(true);
  });

  it('saves editable AI provider settings without exposing or replacing the saved key', async () => {
    await addLog({ axis: 'body', type: 'manual_evidence', value: 1, date: '2026-09-26' });
    render(<App />);
    await waitForApp();
    fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));
    fireEvent.click(screen.getByText('AI & Provider'));
    fireEvent.change(await screen.findByLabelText('AI base URL'), {
      target: { value: 'https://llm.example/v1' },
    });
    fireEvent.change(screen.getByLabelText('AI model'), { target: { value: 'example/model-v2' } });
    expect(screen.getByLabelText('Replacement API key').getAttribute('type')).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Save AI settings' }));

    await waitFor(async () => {
      expect(await getSetting('aiBaseUrl')).toBe('https://llm.example/v1');
      expect(await getSetting('aiModel')).toBe('example/model-v2');
    });
    expect(await getSecureValue('aiApiKey')).toBe('test-api-key');
  });

  it('ignores and restores an audit finding through persisted Resolved state', async () => {
    await addLog({ axis: 'body', type: 'manual_evidence', value: 1, date: '2026-09-26' });
    const auditId = await addAudit({
      period: { start: '2026-09-01T00:00:00.000Z', end: '2026-09-26T00:00:00.000Z' },
      domains: ['body'],
      contradictions: ['Training schedule conflicts with available time.'],
      supportingEvidenceIds: [],
      analysisVersion: 'test',
    });
    render(<App />);
    await waitForApp();
    fireEvent.click(screen.getByRole('tab', { name: 'Audits' }));
    fireEvent.click(await screen.findByText('Training schedule conflicts with available time.'));
    fireEvent.click(screen.getByRole('button', { name: 'Ignore finding' }));
    fireEvent.click(screen.getByRole('button', { name: 'Already handled' }));

    await waitFor(async () => {
      expect(Object.values((await getLatestAudit()).findingStates || {}).some(state => (
        state.status === 'ignored' && state.reason === 'Already handled'
      ))).toBe(true);
    });
    fireEvent.click(screen.getByRole('button', { name: 'resolved', exact: true }));
    expect(await screen.findByText('Training schedule conflicts with available time.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Restore finding' }));
    await waitFor(async () => {
      expect(Object.values((await getLatestAudit()).findingStates || {}).some(state => state.status === 'open')).toBe(true);
    });
    expect(auditId).toBeTruthy();
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

  it('filters and selects Jarvis slash commands with the keyboard', async () => {
    render(<JarvisTab />);
    const composer = await screen.findByRole('combobox', { name: 'Tell Jarvis what you want' });
    fireEvent.change(composer, { target: { value: '/rev' } });

    const reviseCommand = await screen.findByRole('option', { name: 'Revise target' });
    const reviewCommand = screen.getByRole('option', { name: 'Review my system' });
    expect(reviseCommand.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(composer, { key: 'ArrowDown' });
    expect(reviewCommand.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(composer, { key: 'Enter' });
    expect(composer.value).toBe('Review my system ');
    expect(screen.queryByRole('listbox')).toBeNull();

    fireEvent.change(composer, { target: { value: '/no-such-command' } });
    expect(await screen.findByText('No matching commands.')).toBeTruthy();
    fireEvent.keyDown(composer, { key: 'Enter' });
    expect(composer.value).toBe('/no-such-command');
    fireEvent.keyDown(composer, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('builds Jarvis review stories from saved logs and hands off to chat', async () => {
    await addLog({
      axis: 'body',
      type: 'manual_evidence',
      value: 1,
      date: new Date().toISOString().slice(0, 10),
      meta: { content: 'Completed a planned run' },
    });
    render(<JarvisTab />);
    expect(await screen.findByText('Recent activity')).toBeTruthy();
    expect(await screen.findByText('Completed a planned run')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: 'Review recent evidence' }));

    expect(await screen.findByText('1 recorded entries')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next review story' }));
    expect(await screen.findByText('Recorded by axis')).toBeTruthy();
    expect(screen.getByText('body')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next review story' }));
    expect(await screen.findByText('Latest saved entry')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ask Jarvis' }));
    expect(screen.getByRole('combobox').value).toBe('Review my recent evidence from the last 28 days.');
  });

  it('executes only the plan steps selected on the Jarvis Plan board', async () => {
    const impact = {
      affectedDomains: [],
      scoringImpact: '',
      routineImpact: '',
      identityAlignment: '',
      disciplineImpact: '',
      risks: [],
      dependencies: [],
    };
    await saveConversation({
      id: 'jarvis_default',
      type: 'Jarvis',
      createdAt: new Date().toISOString(),
      messages: [{
        role: 'assistant',
        content: 'A two-step plan.',
        proposalStatus: 'pending',
        proposal: {
          actionType: 'create_plan',
          payload: {
            steps: [
              { actionType: 'add_quest', payload: { title: 'Selected plan step', domain: 'body', metric: { type: 'manual' } } },
              { actionType: 'add_quest', payload: { title: 'Excluded plan step', domain: 'body', metric: { type: 'manual' } } },
            ],
          },
          impact,
          reasoning: 'Plan board integration test',
          confidence: 0.8,
        },
      }],
    });
    render(<JarvisTab />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open plan board' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include step: Excluded plan step' }));
    expect(screen.getByText('1 of 2 selected')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Review selected steps' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Apply' }));

    await waitFor(async () => {
      const { getAllQuests } = await import('../../src/database/questBoardRepository.js');
      const quests = await getAllQuests();
      expect(quests.some(quest => quest.title === 'Selected plan step')).toBe(true);
      expect(quests.some(quest => quest.title === 'Excluded plan step')).toBe(false);
    });
  });
});
