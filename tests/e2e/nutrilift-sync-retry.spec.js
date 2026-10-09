import { expect, test } from './fixtures.js';
import { defineScenario } from '../testlab/scenario.js';

const scenario = defineScenario({
  id: 'SYNC-RETRY-001',
  title: 'External sync failure preserves prior state and recovers on retry',
  persona: 'offline-user',
  fixture: 'returning-user',
  environment: {
    device: 'desktop',
    viewport: '1280x800',
    network: 'normal',
    clock: 'test',
    timezone: 'UTC',
  },
  testTime: '2026-10-02T08:00:00Z',
  objective: 'Recover from an external sync error without losing the cursor or prior successful state.',
  actions: [
    'Open Integrations settings',
    'Run NutriLift sync while its service is unavailable',
    'Retry after the service recovers',
  ],
  expected: [
    'Failed sync preserves the prior cursor and last successful timestamp',
    'Successful retry clears the sync error without importing duplicates',
  ],
  invariants: [
    'Sync failure does not advance the cursor or erase prior successful state',
    'No facts are imported from a failed or empty sync response',
  ],
  limits: { durationMs: 120_000, maxBrowserActions: 16, maxRetries: 1 },
  evidence: { screenshots: true, console: true, network: true, stateSnapshot: true },
});

test.use({ testLabScenario: scenario });

async function readSyncState(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('actions-tracker');
    request.onerror = () => reject(request.error || new Error('Could not open the app database.'));
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('syncState', 'readonly');
      const read = transaction.objectStore('syncState').get('nutrilift');
      read.onsuccess = () => resolve(read.result || null);
      read.onerror = () => reject(read.error || new Error('Could not read NutriLift sync state.'));
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => reject(transaction.error || new Error('Sync-state read failed.'));
    };
  }));
}

test('preserves the sync cursor and prior success across failure and retry', async ({ page, testLab }) => {
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), 'Uses a local test-only Supabase endpoint.');

  let syncAttempts = 0;
  const syncRequestUrls = [];
  await page.route('**/auth/v1/user', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'test-user',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test@example.invalid',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      created_at: '2026-10-01T00:00:00.000Z',
    }),
  }));
  await page.route('**/rest/v1/sync_records*', async route => {
    const request = route.request();
    const origin = request.headers().origin || 'http://127.0.0.1:4174';
    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': origin,
          'access-control-allow-methods': 'GET, OPTIONS',
          'access-control-allow-headers': request.headers()['access-control-request-headers'] || 'apikey, authorization, content-type, x-client-info',
        },
      });
      return;
    }

    syncAttempts += 1;
    syncRequestUrls.push(request.url());
    const corsHeaders = { 'access-control-allow-origin': origin };
    if (syncAttempts === 1) {
      await route.fulfill({
        status: 500,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Temporary sync outage.', code: 'TEST_OUTAGE' }),
      });
      return;
    }

    await route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '[]' });
  });
  await page.addInitScript(() => {
    localStorage.setItem('actions_tracker_fresh_start_2026_09_26', '1');
    localStorage.setItem('yearEndGoals.daily', JSON.stringify({
      '2026-10-02': { body: true, philosophy: false, art: false, history: false },
    }));
    localStorage.setItem('sb-test-project-auth-token', JSON.stringify({
      access_token: 'test-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'test-refresh-token',
      user: {
        id: 'test-user',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'test@example.invalid',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        created_at: '2026-10-01T00:00:00.000Z',
      },
    }));
  });

  await testLab.open('/');
  await expect(page.getByRole('tab', { name: 'Stats' })).toBeVisible({ timeout: 60_000 });

  await page.getByRole('button', { name: 'Open Settings' }).click();
  await page.getByRole('button', { name: /Integrations/ }).click();
  await expect(page.getByText('● Connected')).toBeVisible();

  const previousCursor = JSON.stringify({
    sourceUpdatedAt: '2026-10-01T12:00:00.000Z',
    externalId: 'record-9',
  });
  const previousSuccess = '2026-10-01T13:00:00.000Z';
  await page.evaluate(({ cursor, lastSuccessfulSync }) => new Promise((resolve, reject) => {
    const request = indexedDB.open('actions-tracker');
    request.onerror = () => reject(request.error || new Error('Could not open the app database.'));
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('syncState', 'readwrite');
      transaction.objectStore('syncState').put({
        connectorId: 'nutrilift',
        schemaVersion: 1,
        cursor,
        lastSuccessfulSync,
        lastAttemptedSync: null,
        status: 'idle',
        lastError: null,
        connectorVersion: '1.1',
      });
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onabort = () => reject(transaction.error || new Error('Could not seed sync state.'));
      transaction.onerror = () => reject(transaction.error || new Error('Could not seed sync state.'));
    };
  }), { cursor: previousCursor, lastSuccessfulSync: previousSuccess });

  await page.getByRole('button', { name: 'Sync NutriLift now' }).click();
  await expect(page.getByRole('alert')).toContainText('Sync failed:');
  expect(syncAttempts).toBe(1);
  await expect.poll(async () => {
    const state = await readSyncState(page);
    return {
      status: state?.status,
      cursor: state?.cursor,
      lastSuccessfulSync: state?.lastSuccessfulSync,
      lastError: state?.lastError,
    };
  }).toEqual({
    status: 'error',
    cursor: previousCursor,
    lastSuccessfulSync: previousSuccess,
    lastError: 'Temporary sync outage.',
  });
  await testLab.checkpoint('sync-failure-preserved');

  await page.getByRole('button', { name: 'Sync NutriLift now' }).click();
  await expect(page.getByRole('status')).toContainText('Imported 0 facts');
  await expect.poll(async () => (await readSyncState(page))?.status).toBe('idle');
  const recoveredState = await readSyncState(page);
  expect(recoveredState.cursor).toBe(previousCursor);
  expect(recoveredState.lastSuccessfulSync).not.toBe(previousSuccess);
  expect(recoveredState.lastError).toBeNull();
  expect(syncAttempts).toBe(2);
  expect(syncRequestUrls[1]).toBe(syncRequestUrls[0]);

  const snapshot = await testLab.readIndexedDbSnapshot();
  expect(snapshot.stores.facts).toHaveLength(0);
  await testLab.checkpoint('sync-retried');
});
