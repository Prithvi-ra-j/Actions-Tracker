import { expect, test } from './fixtures.js';
import { defineScenario } from '../testlab/scenario.js';

const scenario = defineScenario({
  id: 'RECOVERY-MIGRATION-001',
  title: 'Legacy local evidence survives a user journey and reload',
  persona: 'returning-user',
  fixture: 'legacy-year-end-checkin',
  environment: {
    device: 'desktop',
    viewport: '1280x800',
    network: 'normal',
    clock: 'test',
    timezone: 'UTC',
  },
  testTime: '2026-10-02T08:00:00Z',
  objective: 'Resume migrated history, record evidence, and verify persistence after reload.',
  actions: ['Open the migrated app', 'Record evidence', 'Reload the app'],
  expected: ['Legacy evidence remains', 'New evidence is persisted after reload'],
  invariants: ['Evidence is not duplicated by reloading', 'The visible UI has no page errors'],
  limits: { durationMs: 90_000, maxBrowserActions: 20, maxRetries: 1 },
  evidence: { screenshots: true, console: true, network: true, stateSnapshot: true },
});

async function readLogs(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('actions-tracker');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('logs', 'readonly');
      const records = transaction.objectStore('logs').getAll();
      records.onsuccess = () => resolve(records.result);
      records.onerror = () => reject(records.error);
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => reject(transaction.error);
    };
  }));
}

test.use({ testLabScenario: scenario });

test('migrated local data remains after recording evidence and reloading', async ({ page, testLab }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const migratedDate = '2026-10-02';
  await page.addInitScript(date => {
    localStorage.setItem('actions_tracker_fresh_start_2026_09_26', '1');
    localStorage.setItem('yearEndGoals.daily', JSON.stringify({
      [date]: { body: true, philosophy: false, art: false, history: false },
    }));
  }, migratedDate);

  await testLab.open('/');
  await expect(page.getByRole('tab', { name: 'Stats' })).toBeVisible({ timeout: 60_000 });
  expect(pageErrors).toEqual([]);
  await expect.poll(async () => (
    (await readLogs(page)).some(log => log.date === migratedDate && log.meta?.task === 'body')
  ), { timeout: 60_000 }).toBe(true);
  await testLab.checkpoint('migration-loaded');

  const evidenceText = `Playwright evidence ${Date.now()}`;
  await page.getByRole('button', { name: 'Log evidence' }).click();
  await page.getByPlaceholder('What did you do? What did you notice?').fill(evidenceText);
  await page.getByLabel('Evidence type').selectOption('result');
  await page.getByLabel('Evidence axis').selectOption('discipline');
  await page.getByRole('button', { name: 'Save evidence' }).click();

  await expect.poll(async () => (
    (await readLogs(page)).some(log => (
      log.type === 'manual_evidence' &&
      log.axis === 'discipline' &&
      log.meta?.content === evidenceText &&
      log.meta?.evidenceType === 'result'
    ))
  ), { timeout: 30_000 }).toBe(true);
  await testLab.checkpoint('evidence-saved');

  await page.reload();
  await expect(page.getByRole('tab', { name: 'Stats' })).toBeVisible({ timeout: 60_000 });
  await expect.poll(async () => (
    (await readLogs(page)).some(log => log.meta?.content === evidenceText)
  ), { timeout: 30_000 }).toBe(true);
  await testLab.checkpoint('reloaded');
});