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
  limits: { durationMs: 60_000, maxBrowserActions: 40, maxRetries: 0 },
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
  await expect(page.getByRole('button', { name: 'Stats' })).toBeVisible({ timeout: 60_000 });
  expect(await page.evaluate(() => [window.innerWidth, window.innerHeight])).toEqual([393, 851]);
  await expect(page.getByRole('main')).toBeVisible();
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await page.keyboard.press('Tab');
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();

  const statsButton = page.getByRole('button', { name: 'Stats' });
  await statsButton.click();
  await expect(page.getByRole('heading', { name: 'Stats' })).toBeVisible();
  await expect(statsButton).toHaveAttribute('aria-current', 'page');

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 360, height: 640 },
    { width: 393, height: 851 },
    { width: 430, height: 932 },
    { width: 667, height: 375 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    for (const [tab, pageId] of [
      ['Today', 'daily'],
      ['Stats', 'stats'],
      ['Learn', 'learn'],
      ['Goals', 'goals'],
      ['Audits', 'audits'],
    ]) {
      await page.getByRole('button', { name: tab }).click();
      await expect(page.locator(`#page-${pageId}`)).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }));
      expect(dimensions.document, `${tab} overflows at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(dimensions.viewport);
    }
  }

  await testLab.checkpoint('mobile-stats');
});
