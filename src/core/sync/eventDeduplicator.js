export function externalEventKey(event) {
  const source = event?.source || {};
  if (!source.connectorId || !source.externalId) return null;
  return [source.connectorId, source.externalId, source.externalVersion || '', event.type || ''].join('|');
}

export function deduplicateConnectorEvents(events = [], existingKeys = new Set()) {
  const seen = new Set(existingKeys);
  const accepted = [];
  const duplicates = [];
  for (const event of events) {
    const key = externalEventKey(event);
    if (key && seen.has(key)) {
      duplicates.push(event);
      continue;
    }
    accepted.push(event);
    if (key) seen.add(key);
  }
  return { accepted, duplicates, keys: seen };
}
