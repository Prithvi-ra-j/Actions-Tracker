import { expect, test } from './fixtures.js';
import { defineScenario } from '../testlab/scenario.js';

const syntheticJourneys = [
  {
    id: 'SYN-FIRST-001',
    persona: 'early-career-exercise-beginner',
    title: 'Find a small after-work movement habit',
    device: 'desktop',
    viewport: '1280x800',
    network: 'normal',
    habit: 'Take a 10-minute walk after work',
  },
  {
    id: 'SYN-FIRST-002',
    persona: 'time-constrained-commuter',
    title: 'Start with a habit that fits a packed day',
    device: 'desktop',
    viewport: '1280x800',
    network: 'normal',
    habit: 'Walk for two minutes at lunch',
  },
  {
    id: 'SYN-FIRST-003',
    persona: 'privacy-conscious-offline-user',
    title: 'Complete a first habit without an AI connection',
    device: 'desktop-offline-after-load',
    viewport: '1280x800',
    network: 'normal',
    offlineAfterLoad: true,
    habit: 'Take a short walk outside',
  },
  {
    id: 'SYN-FIRST-004',
    persona: 'mobile-first-new-professional',
    title: 'Create and complete a habit on a narrow phone viewport',
    device: 'mobile-profile',
    viewport: '360x640',
    network: 'normal',
    habit: 'Walk to the next bus stop',
  },
  {
    id: 'SYN-FIRST-005',
    persona: 'low-confidence-routine-builder',
    title: 'Choose a simple first action without an AI account',
    device: 'desktop',
    viewport: '1280x800',
    network: 'normal',
    habit: 'Put on walking shoes',
  },
];

for (const journey of syntheticJourneys) {
  const scenario = defineScenario({
    id: journey.id,
    title: journey.title,
    persona: journey.persona,
    fixture: 'empty-user',
    environment: {
      device: journey.device,
      viewport: journey.viewport,
      network: journey.network,
      clock: 'test',
      timezone: 'UTC',
    },
    testTime: '2026-10-02T08:00:00Z',
    objective: 'Reach and complete one useful habit in the first-use flow.',
    actions: [
      'Choose a growth area without configuring Ved',
      'Add one synthetic movement habit to the starter plan',
      'Complete the habit',
    ],
    expected: [
      'The first-use flow works without an AI key or account',
      'The synthetic habit is visibly completed',
      'The first completed habit is reached in under 60 seconds',
    ],
    invariants: [
      'Only synthetic scenario data is entered',
      'The habit is attributed to the body domain',
      'No external AI service is required',
    ],
    limits: { durationMs: 60_000, maxBrowserActions: 20, maxRetries: 0 },
    evidence: { screenshots: true, console: true, network: true, stateSnapshot: true },
  });

  test.describe(journey.id, () => {
    test.use({ testLabScenario: scenario });

    test(journey.title, async ({ page, testLab }) => {
      await page.addInitScript(() => {
        localStorage.setItem('actions_tracker_fresh_start_2026_09_26', '1');
      });

      const startedAt = Date.now();
      await testLab.open('/');
      await page.getByRole('button', { name: 'Get started' }).click();
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByLabel('Add your own habit (optional)').fill(journey.habit);
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByRole('button', { name: 'Go to Today' }).click();

      const habitName = page.locator('#page-daily').getByText(journey.habit, { exact: true });
      await expect(habitName).toBeVisible();
      if (journey.offlineAfterLoad) await testLab.disconnectNetwork();
      const completionControl = habitName.locator('xpath=../..').getByRole('checkbox');
      await completionControl.click();
      await expect(completionControl).toHaveAttribute('aria-checked', 'true');
      const elapsedMs = Date.now() - startedAt;
      expect(elapsedMs, 'Synthetic first-use journey exceeded the 60-second target')
        .toBeLessThan(60_000);
      await expect(page.getByRole('region', { name: 'Habit reminder' })).toBeVisible();

      const snapshot = await testLab.readIndexedDbSnapshot();
      expect(snapshot.stores.habits).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: journey.habit, domain: 'body', status: 'active' }),
      ]));
      const habit = snapshot.stores.habits.find(item => item.name === journey.habit);
      expect(snapshot.stores.habitOccurrences).toEqual(expect.arrayContaining([
        expect.objectContaining({ habitId: habit.id, status: 'completed' }),
      ]));
      if (journey.viewport === '360x640') {
        expect(await page.evaluate(() => [window.innerWidth, window.innerHeight])).toEqual([360, 640]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth))
          .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
      }

      await testLab.checkpoint('first-habit-completed');
    });
  });
}
