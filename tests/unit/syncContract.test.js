import { describe, expect, it } from 'vitest';
import { normalizeConnectorEvent, validateConnector } from '../../src/core/sync/connectorContract.js';
import { deduplicateConnectorEvents } from '../../src/core/sync/eventDeduplicator.js';

describe('integration contract', () => {
  it('normalizes and deduplicates provider events', () => {
    const connector = { id: 'health', getStatus() {}, sync() {} };
    expect(validateConnector(connector)).toBe(true);
    const event = normalizeConnectorEvent({ type: 'workout', externalId: '42' }, 'health');
    const result = deduplicateConnectorEvents([event, event], new Set());
    expect(result.accepted).toHaveLength(1);
    expect(result.duplicates).toHaveLength(1);
  });
});
