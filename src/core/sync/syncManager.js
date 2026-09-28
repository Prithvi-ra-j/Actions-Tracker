import { getSyncState, markSyncStarted, markSyncSuccess, markSyncError } from '../../database/syncStateRepository.js';
import { addFact } from '../../database/factsRepository.js';

const registry = new Map();

export function registerConnector(connector) {
  if (!connector?.id || typeof connector.getStatus !== 'function' || typeof connector.sync !== 'function') {
    throw new Error('[syncManager] Connector must provide id, getStatus(), and sync().');
  }
  registry.set(connector.id, connector);
}

export function getRegisteredConnectors() {
  return [...registry.values()];
}

export async function getConnectorStatuses() {
  const statuses = {};
  for (const [id, connector] of registry.entries()) {
    try {
      statuses[id] = await connector.getStatus();
    } catch (error) {
      statuses[id] = { status: 'error', message: error.message };
    }
  }
  return statuses;
}

export async function runAllSyncs() {
  const summary = {
    startedAt: new Date().toISOString(),
    connectorsRun: 0,
    totalImported: 0,
    totalUpdated: 0,
    totalIgnored: 0,
    errors: [],
  };

  for (const [id, connector] of registry.entries()) {
    try {
      const state = await getSyncState(id);
      const status = await connector.getStatus();
      if (status !== 'connected') continue;

      await markSyncStarted(id);
      summary.connectorsRun++;

      const result = await connector.sync({}, state);
      let ingestedCount = 0;

      // Facts are immutable. A NutriLift source update keeps the deterministic
      // source projection id, while a retraction is a new ledger fact targeting
      // the source fact. We deliberately do not advance the cursor until every
      // returned fact is written successfully.
      if (result.facts?.length) {
        for (const fact of result.facts) {
          await addFact(fact);
          ingestedCount++;
        }
      }

      if (result.status === 'failed') {
        await markSyncError(id, result.errors?.[0]?.message || 'Unknown sync error');
        summary.errors.push({ id, message: result.errors?.[0]?.message || 'Connector reported failure' });
        continue;
      }

      await markSyncSuccess(id, result.cursor);
      summary.totalImported += ingestedCount;
      summary.totalUpdated += result.updated || 0;
      summary.totalIgnored += result.ignored || 0;
    } catch (err) {
      console.error(`[syncManager] Unhandled error syncing connector ${id}:`, err);
      await markSyncError(id, err.message);
      summary.errors.push({ id, message: err.message });
    }
  }

  summary.completedAt = new Date().toISOString();
  return summary;
}
