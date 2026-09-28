// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllDatabaseData, closeDB, dbDelete, dbGet, initDB } from '../../src/database/db.js';
import { getAppMeta, setAppMeta } from '../../src/database/appMetaRepository.js';
import { applyFreshStartReset } from '../../src/core/freshStartReset.js';


describe('fresh-start reset safety', () => {
  beforeEach(async () => {
    try { closeDB(); } catch {}
    await initDB();
    await clearAllDatabaseData();
    await dbDelete('appMeta', 'installationBaseline');
    localStorage.clear();
  });

  it('never resets an existing installation with a durable baseline', async () => {
    await initDB();
    await setAppMeta('installationBaseline', { release: 'existing', createdAt: new Date().toISOString() });
    const resetApplied = await applyFreshStartReset();
    expect(resetApplied).toBe(false);
    expect(await dbGet('appMeta', 'installationBaseline')).toBeTruthy();
  });

  it('allows the historical reset exactly once on a genuinely fresh installation', async () => {
    const first = await applyFreshStartReset();
    expect(first).toBe(true);
    expect(await getAppMeta('installationBaseline')).toMatchObject({ resetApplied: true });

    const second = await applyFreshStartReset();
    expect(second).toBe(false);
  });

  it('does not repeat a reset when localStorage is unavailable after the first reset', async () => {
    const originalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new Error('storage unavailable'); },
    });
    try {
      expect(await applyFreshStartReset()).toBe(true);
      expect(await applyFreshStartReset()).toBe(false);
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalStorage });
    }
  });
});
