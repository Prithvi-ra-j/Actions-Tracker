import { expect, test } from './fixtures.js';
import { defineScenario } from '../testlab/scenario.js';
import { buildFixture } from '../testlab/catalog.js';

const scenario = defineScenario({
  id: 'LAB-HARNESS-001',
  title: 'Test lab captures a deterministic browser interaction',
  persona: 'returning-user',
  fixture: 'inconsistent-user-v3',
  environment: {
    device: 'desktop',
    viewport: '800x600',
    network: 'normal',
    clock: 'test',
  },
  testTime: '2026-10-02T08:00:00+05:30',
  objective: 'Verify clock, interaction, and evidence capture.',
  actions: ['Open a small test page', 'Click its action'],
  expected: ['The action updates the page'],
  invariants: ['Evidence contains no user-entered text'],
  limits: { durationMs: 90_000, maxBrowserActions: 5, maxRetries: 0 },
  evidence: { screenshots: true, console: true, network: true, stateSnapshot: false },
});

test.use({ testLabScenario: scenario });

test('captures interaction metrics and test-clock time without recording typed values', async ({ page, testLab }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('actions_tracker_fresh_start_2026_09_26', '1');
    localStorage.setItem('yearEndGoals.daily', JSON.stringify({
      '2026-10-02': { body: true, philosophy: false, art: false, history: false },
    }));
  });
  await testLab.open('/');
  await expect(page.getByRole('tab', { name: 'Stats' })).toBeVisible({ timeout: 60_000 });
  expect(await page.evaluate(() => new Date().toISOString().slice(0, 16))).toBe('2026-10-02T02:30');

  const fixture = buildFixture('inconsistent-user-v3');
  expect(await testLab.seedFixture(fixture)).toEqual({ logs: 127, goals: 4 });
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Stats' })).toBeVisible({ timeout: 60_000 });
  const snapshot = await testLab.readIndexedDbSnapshot();
  expect(snapshot.stores.logs.filter(log => log.meta?.fixtureId === fixture.id)).toHaveLength(127);
  expect(snapshot.stores.lifeObjects.filter(goal => goal.source === 'testlab')).toHaveLength(4);

  await page.getByRole('tab', { name: 'Stats' }).dispatchEvent('click');
  await testLab.failRequests('**/__testlab-controlled-failure');
  const failedFetch = await page.evaluate(async () => {
    try {
      await fetch('/__testlab-controlled-failure');
      return false;
    } catch {
      return true;
    }
  });
  expect(failedFetch).toBe(true);
  await testLab.injectEvent('SYSTEM_EVENT', { name: 'network_disconnected' });
  await testLab.advanceTime({ minutes: 5 });
  expect(await page.evaluate(() => new Date().toISOString().slice(0, 16))).toBe('2026-10-02T02:35');
  await testLab.checkpoint('completed');
  const evidence = await testLab.finish();

  expect(evidence.interaction.clicks).toBe(1);
  expect(evidence.injectedEvents.map(event => event.name)).toEqual([
    'request_failure_injected',
    'network_disconnected',
    'clock_advanced',
  ]);
  expect(testInfo.attachments.some(attachment => attachment.name === `${scenario.id}-evidence.json`)).toBe(true);
});
