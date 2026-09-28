export const CONNECTOR_CONTRACT_VERSION = '2.0';

export function validateConnector(connector) {
  const required = ['id', 'getStatus', 'sync'];
  const missing = required.filter(key => typeof connector?.[key] !== 'function' && !(key === 'id' && connector?.id));
  if (missing.length) throw new Error(`Connector contract violation: missing ${missing.join(', ')}`);
  return true;
}

export function normalizeConnectorEvent(event, connectorId) {
  if (!event || typeof event !== 'object') throw new Error('Connector event must be an object');
  return {
    ...event,
    source: {
      ...(event.source || {}),
      connectorId: event.source?.connectorId || connectorId,
      externalId: event.source?.externalId || event.externalId || null,
      externalVersion: event.source?.externalVersion || event.externalVersion || null,
    },
    observedAt: event.observedAt || new Date().toISOString(),
    contractVersion: CONNECTOR_CONTRACT_VERSION,
  };
}
