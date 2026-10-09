import { validateScenario } from './scenario.js';
import { APP_VERSION } from '../../src/version.js';

function safeUrl(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return '[invalid-url]';
  }
}

export async function readIndexedDbSnapshot(page, databaseName = 'actions-tracker') {
  return page.evaluate(async name => {
    const databases = await indexedDB.databases();
    if (!databases.some(database => database.name === name)) return null;
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error(`Could not open ${name}.`));
      request.onblocked = () => reject(new Error(`Opening ${name} was blocked.`));
    });

    try {
      const storeNames = Array.from(database.objectStoreNames);
      if (storeNames.length === 0) {
        return { name: database.name, version: database.version, stores: {} };
      }

      const transaction = database.transaction(storeNames, 'readonly');
      const stores = Object.fromEntries(storeNames.map(storeName => [
        storeName,
        new Promise((resolve, reject) => {
          const request = transaction.objectStore(storeName).getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error || new Error(`Could not read ${storeName}.`));
        }),
      ]));
      const records = await Promise.all(Object.entries(stores).map(async ([storeName, rows]) => [
        storeName,
        await rows,
      ]));
      await new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onabort = () => reject(transaction.error || new Error('Snapshot transaction aborted.'));
        transaction.onerror = () => reject(transaction.error || new Error('Snapshot transaction failed.'));
      });
      return { name: database.name, version: database.version, stores: Object.fromEntries(records) };
    } finally {
      database.close();
    }
  }, databaseName);
}

export async function seedIndexedDbFixture(page, fixture) {
  if (!fixture?.id || !Array.isArray(fixture.actions) || !Array.isArray(fixture.goals)) {
    throw new Error('Fixture must include an id, actions array, and goals array.');
  }

  return page.evaluate(async data => {
    const knownDatabases = await indexedDB.databases();
    if (!knownDatabases.some(database => database.name === 'actions-tracker')) {
      throw new Error('The app database must be initialized before loading a test fixture.');
    }

    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('actions-tracker');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open the app database.'));
      request.onblocked = () => reject(new Error('Opening the app database was blocked.'));
    });

    try {
      for (const storeName of ['logs', 'lifeObjects']) {
        if (!database.objectStoreNames.contains(storeName)) {
          throw new Error(`The app database is missing fixture store "${storeName}".`);
        }
      }

      const logs = data.actions.map(action => ({
        id: action.id,
        axis: action.axis,
        type: action.status === 'missed' ? 'missed_action' : 'manual_evidence',
        value: action.value,
        date: action.date,
        meta: {
          task: action.type,
          content: action.content,
          source: 'testlab',
          fixtureId: data.id,
          completionStatus: action.status,
        },
      }));
      const goals = data.goals.map(goal => ({ ...goal }));
      const prefix = `testlab/${data.id}/`;

      await new Promise((resolve, reject) => {
        const transaction = database.transaction(['logs', 'lifeObjects'], 'readwrite');
        for (const [storeName, records] of [['logs', logs], ['lifeObjects', goals]]) {
          const store = transaction.objectStore(storeName);
          const request = store.getAll();
          request.onsuccess = () => {
            for (const record of request.result) {
              if (typeof record.id === 'string' && record.id.startsWith(prefix)) {
                store.delete(record.id);
              }
            }
            for (const record of records) store.put(record);
          };
          request.onerror = () => transaction.abort();
        }
        transaction.oncomplete = resolve;
        transaction.onabort = () => reject(transaction.error || new Error('Fixture seed transaction aborted.'));
        transaction.onerror = () => reject(transaction.error || new Error('Fixture seed transaction failed.'));
      });

      localStorage.setItem('actions_tracker_fresh_start_2026_09_26', '1');
      return { logs: logs.length, goals: goals.length };
    } finally {
      database.close();
    }
  }, fixture);
}

export function createTestLab({ page, testInfo, scenario }) {
  validateScenario(scenario);

  const startedAt = Date.now();
  const consoleEvents = [];
  const networkRequests = [];
  const requestFailures = [];
  const httpFailures = [];
  const navigationEvents = [];
  const cleanupRoutes = [];
  const injectedEvents = [];
  let disposed = false;
  let started = false;
  let intermittentRequestCount = 0;
  const beginOffline = scenario.environment.network === 'offline';

  page.on('console', message => {
    if (message.type() === 'error') {
      consoleEvents.push({ type: 'error', location: safeUrl(message.location().url) });
    }
  });
  page.on('pageerror', () => consoleEvents.push({ type: 'pageerror' }));
  page.on('request', request => networkRequests.push({
    method: request.method(),
    resourceType: request.resourceType(),
    url: safeUrl(request.url()),
  }));
  page.on('requestfailed', request => requestFailures.push({
    method: request.method(),
    url: safeUrl(request.url()),
  }));
  page.on('response', response => {
    if (response.status() >= 400) {
      httpFailures.push({
        status: response.status(),
        method: response.request().method(),
        url: safeUrl(response.url()),
      });
    }
  });
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) navigationEvents.push(safeUrl(frame.url()));
  });

  async function installInstrumentation() {
    const initialize = () => {
      const metrics = {
        clicks: 0,
        keyPresses: 0,
        inputEdits: 0,
        domUpdates: 0,
        firstActionAt: null,
        firstDomUpdateAfterActionMs: null,
      };
      window.__actionsTrackerTestLab = metrics;
      document.addEventListener('click', () => {
        metrics.clicks += 1;
        if (metrics.firstActionAt === null) metrics.firstActionAt = performance.now();
      }, true);
      document.addEventListener('keydown', () => {
        metrics.keyPresses += 1;
        if (metrics.firstActionAt === null) metrics.firstActionAt = performance.now();
      }, true);
      document.addEventListener('input', () => {
        metrics.inputEdits += 1;
        if (metrics.firstActionAt === null) metrics.firstActionAt = performance.now();
      }, true);
      const observe = () => {
        if (!document.documentElement) return;
        new MutationObserver(() => {
          metrics.domUpdates += 1;
          if (metrics.firstActionAt !== null && metrics.firstDomUpdateAfterActionMs === null) {
            metrics.firstDomUpdateAfterActionMs = performance.now() - metrics.firstActionAt;
          }
        }).observe(document.documentElement, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
        });
      };
      if (document.documentElement) observe();
      else document.addEventListener('DOMContentLoaded', observe, { once: true });
    };
    await page.addInitScript(initialize);
    await page.evaluate(initialize);
  }

  async function start() {
    if (started) return;
    if (scenario.environment.viewport) {
      const match = /^(\d+)x(\d+)$/.exec(scenario.environment.viewport);
      if (!match) throw new Error(`Invalid scenario viewport "${scenario.environment.viewport}".`);
      await page.setViewportSize({ width: Number(match[1]), height: Number(match[2]) });
    }
    await installInstrumentation();
    await page.clock.install({ time: new Date(scenario.testTime) });
    if (scenario.environment.timezone) {
      const actualTimezone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
      if (actualTimezone !== scenario.environment.timezone) {
        throw new Error(
          `Scenario requires timezone ${scenario.environment.timezone}, but the browser uses ${actualTimezone}.`
        );
      }
    }
    if (scenario.environment.network === 'slow') {
      const route = async requestRoute => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await requestRoute.continue();
      };
      await page.context().route('**/*', route);
      cleanupRoutes.push(() => page.context().unroute('**/*', route));
    } else if (scenario.environment.network === 'intermittent') {
      const route = async requestRoute => {
        if (['fetch', 'xhr'].includes(requestRoute.request().resourceType())) {
          intermittentRequestCount += 1;
          if (intermittentRequestCount % 3 === 0) {
            await requestRoute.abort('failed');
            return;
          }
        }
        await requestRoute.continue();
      };
      await page.context().route('**/*', route);
      cleanupRoutes.push(() => page.context().unroute('**/*', route));
    }
    started = true;
  }

  async function disconnectNetwork() {
    await page.context().setOffline(true);
    injectedEvents.push({
      type: 'SYSTEM_EVENT',
      name: 'network_disconnected',
      at: await page.evaluate(() => new Date().toISOString()),
    });
  }

  async function reconnectNetwork() {
    await page.context().setOffline(false);
    injectedEvents.push({
      type: 'SYSTEM_EVENT',
      name: 'network_reconnected',
      at: await page.evaluate(() => new Date().toISOString()),
    });
  }

  async function failRequests(urlPattern) {
    if (!urlPattern) throw new Error('A URL pattern is required for request failure injection.');
    const route = async requestRoute => requestRoute.abort('failed');
    await page.context().route(urlPattern, route);
    cleanupRoutes.push(() => page.context().unroute(urlPattern, route));
    injectedEvents.push({
      type: 'SYSTEM_EVENT',
      name: 'request_failure_injected',
      at: await page.evaluate(() => new Date().toISOString()),
    });
  }

  async function advanceTime({ minutes = 0, days = 0 }) {
    if (!Number.isFinite(minutes) || !Number.isFinite(days) || minutes < 0 || days < 0) {
      throw new Error('Test-clock advances must be non-negative finite numbers.');
    }
    const milliseconds = (minutes * 60 + days * 24 * 60 * 60) * 1000;
    await page.clock.fastForward(milliseconds);
    injectedEvents.push({
      type: 'TIME_EVENT',
      name: 'clock_advanced',
      at: await page.evaluate(() => new Date().toISOString()),
    });
  }

  async function injectEvent(type, { name } = {}) {
    if (!['USER_EVENT', 'SYSTEM_EVENT', 'TIME_EVENT', 'DATA_EVENT'].includes(type)) {
      throw new Error(`Unsupported injected event type "${type}".`);
    }
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('Injected events require a non-empty name.');
    }
    const event = { type, name };
    injectedEvents.push({ ...event, at: await page.evaluate(() => new Date().toISOString()) });
    await page.evaluate(detail => {
      window.dispatchEvent(new CustomEvent('actions-tracker:test-event', { detail }));
    }, event);
  }

  async function open(path = '/') {
    await start();
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    if (beginOffline) await disconnectNetwork();
  }

  async function checkpoint(label) {
    if (!scenario.evidence.screenshots) return;
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(label)) {
      throw new Error('Evidence checkpoint labels may contain only letters, numbers, and hyphens.');
    }
    await testInfo.attach(`${scenario.id}-${label}.png`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  }

  async function finish({ includeState = scenario.evidence.stateSnapshot } = {}) {
    if (disposed) return;
    disposed = true;
    await Promise.all(cleanupRoutes.map(cleanup => cleanup()));
    let interaction = null;
    let instrumentationError = null;
    let stateSnapshot = null;
    let stateSnapshotError = null;
    try {
      interaction = await page.evaluate(() => window.__actionsTrackerTestLab || null);
    } catch (error) {
      instrumentationError = error.message;
    }
    if (includeState) {
      try {
        stateSnapshot = await readIndexedDbSnapshot(page);
      } catch (error) {
        stateSnapshotError = error.message;
      }
    }

    const browser = page.context().browser();
    const evidence = {
      scenario: {
        id: scenario.id,
        title: scenario.title,
        persona: scenario.persona,
        fixture: scenario.fixture,
        objective: scenario.objective,
        expected: scenario.expected,
        invariants: scenario.invariants,
      },
      runtime: {
        appVersion: APP_VERSION,
        commit: process.env.GITHUB_SHA || process.env.GIT_COMMIT || null,
        browser: browser?.version() || 'unknown',
        viewport: page.viewportSize(),
        testTime: scenario.testTime,
        timezone: interaction
          ? await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone).catch(() => null)
          : null,
        durationMs: Date.now() - startedAt,
      },
      interaction,
      ...(instrumentationError ? { instrumentationError } : {}),
      ...(stateSnapshotError ? { stateSnapshotError } : {}),
      ...(scenario.evidence.console ? { consoleEvents } : {}),
      ...(scenario.evidence.network ? { networkRequests, requestFailures, httpFailures } : {}),
      injectedEvents,
      navigationEvents,
      stateSnapshot,
    };

    await testInfo.attach(`${scenario.id}-evidence.json`, {
      body: Buffer.from(JSON.stringify(evidence, null, 2)),
      contentType: 'application/json',
    });

    const actionCount = (interaction?.clicks || 0) + (interaction?.keyPresses || 0);
    if (scenario.limits?.maxBrowserActions !== undefined && actionCount > scenario.limits.maxBrowserActions) {
      throw new Error(
        `Scenario action limit exceeded: ${actionCount} actions (limit ${scenario.limits.maxBrowserActions}).`
      );
    }
    if (scenario.limits?.durationMs !== undefined && evidence.runtime.durationMs > scenario.limits.durationMs) {
      throw new Error(
        `Scenario duration limit exceeded: ${evidence.runtime.durationMs}ms (limit ${scenario.limits.durationMs}ms).`
      );
    }
    return evidence;
  }

  return {
    checkpoint,
    disconnectNetwork,
    advanceTime,
    failRequests,
    finish,
    injectEvent,
    open,
    readIndexedDbSnapshot: () => readIndexedDbSnapshot(page),
    reconnectNetwork,
    seedFixture: fixture => seedIndexedDbFixture(page, fixture),
    start,
  };
}
