import { describe, expect, it } from 'vitest';
import { getConnectorStatuses, registerConnector } from '../../src/core/sync/syncManager.js';

describe('syncManager connector registry', () => {
  it('rejects incomplete connector objects', () => {
    expect(() => registerConnector({ id: 'invalid' })).toThrow();
  });

  it('exposes registered connector status without fabricating data', async () => {
    registerConnector({
      id: 'test-connector',
      getStatus: async () => 'disconnected',
      sync: async () => ({ status: 'success', facts: [] }),
    });
    expect((await getConnectorStatuses())['test-connector']).toBe('disconnected');
  });
});