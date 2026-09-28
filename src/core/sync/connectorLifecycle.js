export const CONNECTOR_STATES = Object.freeze([
  'available',
  'connecting',
  'permission_required',
  'connected',
  'syncing',
  'synced',
  'sync_failed',
  'disconnected',
]);

export function deriveConnectorLifecycle(connectionStatus, syncState = {}) {
  if (connectionStatus === 'pending') return 'connecting';
  if (connectionStatus === 'permission_required') return 'permission_required';
  if (connectionStatus === 'error') return 'sync_failed';
  if (connectionStatus !== 'connected') return 'disconnected';
  if (syncState.status === 'syncing') return 'syncing';
  if (syncState.status === 'error') return 'sync_failed';
  if (syncState.lastSuccessfulSync) return 'synced';
  return 'connected';
}
