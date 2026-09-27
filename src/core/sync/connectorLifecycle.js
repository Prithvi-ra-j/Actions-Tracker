export const CONNECTOR_STATES = Object.freeze([
  'available',
  'connecting',
  'connected',
  'syncing',
  'synced',
  'sync_failed',
  'disconnected',
]);

export function deriveConnectorLifecycle(connectionStatus, syncState = {}) {
  if (connectionStatus === 'pending') return 'connecting';
  if (connectionStatus === 'error') return 'sync_failed';
  if (connectionStatus !== 'connected') return 'disconnected';
  if (syncState.status === 'syncing') return 'syncing';
  if (syncState.status === 'error') return 'sync_failed';
  if (syncState.lastSuccessfulSync) return 'synced';
  return 'connected';
}
