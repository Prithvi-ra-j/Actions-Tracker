// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import OnboardingFlow from '../../src/components/onboarding/OnboardingFlow.jsx';
import { clearAllDatabaseData, initDB } from '../../src/database/db.js';
import { getAllHabits } from '../../src/database/habitRepository.js';
import { getSelfModel } from '../../src/database/selfModelRepository.js';
import { getReminders, getSetting } from '../../src/database/settingsRepository.js';
import { GROWTH_ATTRIBUTES, HABIT_TEMPLATES } from '../../src/data/habitTemplates.js';
import { commitOnboardingPlan } from '../../src/database/commit.js';

describe('first-run starter plan', () => {
  beforeEach(async () => {
    await initDB();
    await clearAllDatabaseData();
  });
  afterEach(cleanup);

  it('offers six tiny-version templates for each growth area', () => {
    for (const attribute of GROWTH_ATTRIBUTES) {
      const templates = HABIT_TEMPLATES.filter(template => template.domain === attribute.key);
      expect(templates).toHaveLength(6);
      expect(templates.every(template => template.tiny)).toBe(true);
    }
  });

  it('does not save completion or settings when a plan write fails', async () => {
    await expect(commitOnboardingPlan({
      habits: [{ name: 'Missing required ID' }],
      selfModel: { onboardingCompletedAt: '2026-10-02T08:00:00Z' },
      settings: { firstHabitReminderPrompt: 'pending' },
    })).rejects.toThrow();
    expect(await getAllHabits()).toHaveLength(0);
    expect((await getSelfModel()).onboardingCompletedAt).toBeNull();
    expect(await getSetting('firstHabitReminderPrompt')).toBeNull();
  });

  it('saves chosen templates and a custom habit with their area and time without requesting permission', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    render(<OnboardingFlow onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Get started' }));
    fireEvent.click(screen.getByRole('button', { name: 'I want all five' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Add your own habit (optional)'), { target: { value: 'Plan a walk' } });
    fireEvent.change(screen.getByLabelText("Your habit's area"), { target: { value: 'strategy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Time of day'), { target: { value: 'evening' } });
    fireEvent.change(screen.getByLabelText('Reminder time'), { target: { value: '19:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go to Today' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith({ startInToday: true }));
    const habits = await getAllHabits();
    expect(habits).toHaveLength(4);
    expect(habits).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Take a 10-minute walk', domain: 'body', tinyVersion: 'Step outside for two minutes' }),
      expect.objectContaining({ name: 'Plan a walk', domain: 'strategy', implementationIntention: expect.objectContaining({ timeSlot: 'evening' }) }),
    ]));
    expect((await getSelfModel()).onboardingCompletedAt).toBeTruthy();
    expect(await getReminders()).toEqual([{ id: 4, label: 'DAILY REMINDER', time: '19:30', enabled: false }]);
    expect(await getSetting('firstHabitReminderPrompt')).toBe('pending');
  });
});
