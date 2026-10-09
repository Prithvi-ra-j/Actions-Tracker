import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures.js';
import { createTestLab } from '../testlab/playwrightLab.js';
import { defineScenario } from '../testlab/scenario.js';

const scenario = defineScenario({
  id: 'BACKUP-RESTORE-001',
  title: 'Exported data replaces a clean profile and survives reload',
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
  objective: 'Export a real backup and restore it into an isolated clean browser profile.',
  actions: ['Open Data settings', 'Export a backup', 'Restore it into a fresh profile'],
  expected: ['Export contains the migrated record', 'Restore replaces the fresh profile data'],
  invariants: ['The imported backup survives reload', 'Restore requires explicit hold confirmation'],
  limits: { durationMs: 120_000, maxBrowserActions: 30, maxRetries: 0 },
  evidence: { screenshots: true, console: true, network: true, stateSnapshot: true },
});

const restoreScenario = defineScenario({
  ...scenario,
  id: 'BACKUP-RESTORE-002',
  title: 'Isolated profile receives the exported backup',
  fixture: 'clean-profile-with-local-data',
  objective: 'Restore the exported backup into a clean browser context.',
});

test.use({ testLabScenario: scenario });

async function readLogs(page) {
  const snapshot = await page.evaluate(() => new Promise((resolve, reject) => {
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
  return snapshot;
}

test('exports and restores data into a clean profile without leaving the old local record', async ({ page, browser, testLab }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('actions_tracker_fresh_start_2026_09_26', '1');
    localStorage.setItem('yearEndGoals.daily', JSON.stringify({
      '2026-10-02': { body: true, philosophy: false, art: false, history: false },
    }));
  });
  await testLab.open('/');
  await expect(page.getByRole('tab', { name: 'Stats' })).toBeVisible({ timeout: 60_000 });
  await expect.poll(async () => (await readLogs(page)).some(log => (
    log.date === '2026-10-02' && log.meta?.task === 'body'
  ))).toBe(true);

  await page.getByRole('button', { name: 'Open Settings' }).click();
  await page.getByRole('button', { name: /Data Backup & storage/ }).press('Enter');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export data' }).click(),
  ]);
  const backupText = await readFile(await download.path(), 'utf8');
  const backup = JSON.parse(backupText);
  expect(backup.logs.some(log => log.date === '2026-10-02' && log.meta?.task === 'body')).toBe(true);
  await testLab.checkpoint('backup-exported');

  const cleanContext = await browser.newContext({ timezoneId: 'UTC' });
  const cleanPage = await cleanContext.newPage();
  const restoreLab = createTestLab({ page: cleanPage, testInfo, scenario: restoreScenario });
  await restoreLab.start();
  try {
    await cleanPage.addInitScript(() => {
      localStorage.setItem('actions_tracker_fresh_start_2026_09_26', '1');
      localStorage.setItem('yearEndGoals.daily', JSON.stringify({
        '2026-10-01': { body: true, philosophy: false, art: false, history: false },
      }));
    });
    await restoreLab.open('/');
    await expect(cleanPage.getByRole('tab', { name: 'Stats' })).toBeVisible({ timeout: 60_000 });
    await expect.poll(async () => (await readLogs(cleanPage)).some(log => (
      log.date === '2026-10-01' && log.meta?.task === 'body'
    ))).toBe(true);

    await cleanPage.getByRole('button', { name: 'Open Settings' }).click();
    await cleanPage.getByRole('button', { name: /Data Backup & storage/ }).click();
    await cleanPage.getByLabel('Choose backup file').setInputFiles({
      name: 'actions-tracker-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(backupText),
    });
    await expect(cleanPage.getByText(/Restore actions-tracker-backup\.json\?/i)).toBeVisible();

    const holdToConfirm = cleanPage.getByRole('button', { name: 'Hold to confirm' });
    await holdToConfirm.hover();
    await cleanPage.mouse.down();
    await cleanPage.clock.fastForward(800);
    const restoredPageLoad = cleanPage.waitForEvent('load');
    await cleanPage.mouse.up();
    await restoredPageLoad;

    await expect.poll(async () => {
      const logs = await readLogs(cleanPage);
      return {
        imported: logs.some(log => log.date === '2026-10-02' && log.meta?.task === 'body'),
        oldProfileRemoved: !logs.some(log => log.date === '2026-10-01' && log.meta?.task === 'body'),
      };
    }, { timeout: 60_000 }).toEqual({ imported: true, oldProfileRemoved: true });
    await restoreLab.checkpoint('backup-restored');
    await restoreLab.finish();

    await cleanPage.reload();
    await expect.poll(async () => (await readLogs(cleanPage)).some(log => (
      log.date === '2026-10-02' && log.meta?.task === 'body'
    ))).toBe(true);
  } finally {
    await cleanContext.close();
  }
});
