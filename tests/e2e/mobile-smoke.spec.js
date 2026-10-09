import { expect, test } from './fixtures.js';
import { defineScenario } from '../testlab/scenario.js';

const scenario = defineScenario({
  id: 'DEVICE-MOBILE-001',
  title: 'Critical navigation remains available at narrow mobile size',
  persona: 'returning-user',
  fixture: 'legacy-year-end-checkin',
  environment: {
    device: 'samsung-a52-profile',
    viewport: '393x851',
    network: 'normal',
    clock: 'test',
    timezone: 'UTC',
  },
  testTime: '2026-10-02T08:00:00Z',
  objective: 'Open the app on a narrow mobile viewport and reach Stats.',
  actions: ['Open the app', 'Navigate to Stats'],
  expected: ['Stats is visible and usable'],
  invariants: ['The viewport uses the declared mobile dimensions'],
  limits: { durationMs: 60_000, maxBrowserActions: 10, maxRetries: 0 },
  evidence: { screenshots: true, console: true, network: true, stateSnapshot: true },
});

test.use({ testLabScenario: scenario });

test('renders and navigates at the narrow mobile viewport', async ({ page, testLab }) => {
  await page.addInitScript(() => {
    localStorage.setItem('actions_tracker_fresh_start_2026_09_26', '1');
    localStorage.setItem('yearEndGoals.daily', JSON.stringify({
      '2026-10-02': { body: true, philosophy: false, art: false, history: false },
    }));
  });

  await testLab.open('/');
  await expect(page.getByRole('tab', { name: 'Stats' })).toBeVisible({ timeout: 60_000 });
  expect(await page.evaluate(() => [window.innerWidth, window.innerHeight])).toEqual([393, 851]);
  await page.getByRole('tab', { name: 'Stats' }).click();
  await expect(page.getByRole('heading', { name: 'Stats' })).toBeVisible();
  await testLab.checkpoint('mobile-stats');
});
