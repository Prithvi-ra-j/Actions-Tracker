/**
 * Sync Manager (§34 Integration Architecture, §36 Incremental Sync).
 *
 * Orchestrates the synchronization of all registered connectors.
 * Manages the lifecycle: fetching syncState, running connector.sync(),
 * handling errors safely, and inserting the produced facts into the fact ledger.
 */

import { getSyncState, markSyncStarted, markSyncSuccess, markSyncError } from '../../database/syncStateRepository.js';
import { addFact } from '../../database/factsRepository.js';

const registry = new Map();

/**
 * Registers a connector with the sync manager.
 * @param {import('./BaseConnector.js').BaseConnector} connector
 */
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

/**
 * Runs a synchronization cycle for all registered connectors.
 * This is non-blocking to the main thread (mostly IO) but should be run
 * strategically (e.g., in background or on explicit user request).
 *
 * @returns {Promise<object>} Summary of the sync run
 */
export async function runAllSyncs() {
  const summary = {
    startedAt: new Date().toISOString(),
    connectorsRun: 0,
    totalImported: 0,
    errors: []
  };

  for (const [id, connector] of registry.entries()) {
    try {
      const state = await getSyncState(id);
      
      // Check if connector is connected (depends on connector implementation)
      const status = await connector.getStatus();
      if (status !== 'connected') {
        console.log(`[syncManager] Skipping ${id} (status: ${status})`);
        continue;
      }

      await markSyncStarted(id);
      summary.connectorsRun++;

      // Run the sync
      const result = await connector.sync({}, state);

      // Ingest the facts
      let ingestedCount = 0;
      if (result.facts && result.facts.length > 0) {
        for (const fact of result.facts) {
          // Facts must be validated by their schema prior to returning from connector
          await addFact(fact);
          ingestedCount++;
        }
      }

      if (result.status === 'failed') {
        await markSyncError(id, result.errors?.[0]?.message || 'Unknown sync error');
        summary.errors.push({ id, message: 'Connector reported failure' });
      } else {
        await markSyncSuccess(id, result.cursor);
        summary.totalImported += ingestedCount;
      }
    } catch (err) {
      console.error(`[syncManager] Unhandled error syncing connector ${id}:`, err);
      await markSyncError(id, err.message);
      summary.errors.push({ id, message: err.message });
    }
  }

  summary.completedAt = new Date().toISOString();
  return summary;
}
