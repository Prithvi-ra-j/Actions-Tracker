/**
 * Sync Manager (§34 Integration Architecture, §36 Incremental Sync).
 *
 * Orchestrates the synchronization of all registered connectors.
 * Manages the lifecycle: fetching syncState, running connector.sync(),
 * handling errors safely, and inserting the produced facts into the fact ledger.
 */

import { getSyncState, markSyncStarted, markSyncSuccess, markSyncError } from '../../database/syncStateRepository.js';
import { addFact, getAllFacts } from '../../database/factsRepository.js';
import { deriveConnectorLifecycle } from './connectorLifecycle.js';
import { withRetry } from '../recovery/retryPolicy.js';
import { createCorrelationId } from '../observability/structuredError.js';
import { validateConnector, normalizeConnectorEvent } from './connectorContract.js';
import { deduplicateConnectorEvents } from './eventDeduplicator.js';

const registry = new Map();

function externalFactKey(fact) {
  const source = fact?.source || {};
  if (!source.connectorId || !source.externalId) return null;
  return [
    source.connectorId,
    source.externalId,
    source.externalVersion || '',
    fact?.type || '',
  ].join('|');
}

/**
 * Registers a connector with the sync manager.
 * @param {import('./BaseConnector.js').BaseConnector} connector
 */
export function registerConnector(connector) {
  validateConnector(connector);
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
      statuses[id] = 'error';
    }
  }
  return statuses;
}

export async function getConnectorLifecycleStatuses() {
  const statuses = {};
  for (const [id, connector] of registry.entries()) {
    try {
      const connectionStatus = await connector.getStatus();
      const syncState = await getSyncState(id);
      statuses[id] = {
        connectionStatus,
        lifecycle: deriveConnectorLifecycle(connectionStatus, syncState),
        syncState,
      };
    } catch (error) {
      statuses[id] = {
        connectionStatus: 'error',
        lifecycle: 'sync_failed',
        syncState: await getSyncState(id).catch(() => null),
      };
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
    totalIgnored: 0,
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
      const correlationId = createCorrelationId(`sync_${id}`);
      const result = await withRetry(
        () => connector.sync({}, state),
        {
          maxAttempts: 3,
          onRetry: async (decision, error) => {
            console.warn(`[syncManager] Retrying ${id} (${correlationId}) after transient failure:`, error.message);
          },
        }
      );

      // Ingest facts only after the connector result is available. Integration facts
      // are replay-safe when the provider supplies connectorId + externalId.
      let ingestedCount = 0;
      let ignoredCount = 0;
      if (result.facts && result.facts.length > 0) {
        const existingFacts = await getAllFacts();
        const seenExternalFacts = new Set(
          existingFacts
            .map(fact => externalFactKey(fact))
            .filter(Boolean)
        );

        const normalized = result.facts.map(fact => normalizeConnectorEvent(fact, id));
        const deduped = deduplicateConnectorEvents(normalized, seenExternalFacts);
        ignoredCount += deduped.duplicates.length;
        for (const fact of deduped.accepted) {
          // Facts must be validated by their schema prior to returning from connector.
          await addFact(fact);
          ingestedCount++;
        }
      }

      if (result.status === 'failed') {
        await markSyncError(id, result.errors?.[0]?.message || 'Unknown sync error');
        summary.errors.push({ id, message: 'Connector reported failure' });
      } else {
        await markSyncSuccess(id, result.cursor, result.status || 'success');
        summary.totalImported += ingestedCount;
        summary.totalIgnored = (summary.totalIgnored || 0) + ignoredCount;
        if (result.status === 'partial') {
          summary.errors.push({ id, message: 'Connector completed with partial results' });
        }
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
