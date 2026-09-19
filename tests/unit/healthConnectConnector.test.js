import { describe, expect, it, vi } from 'vitest';
import { HealthConnectConnector } from '../../src/core/sync/connectors/HealthConnectConnector.js';

function provider() {
  return {
    checkAvailability: vi.fn().mockResolvedValue({ availability: 'Available' }),
    checkHealthPermissions: vi.fn().mockResolvedValue({ hasAllPermissions: true }),
    requestHealthPermissions: vi.fn().mockResolvedValue({ hasAllPermissions: true }),
    revokeHealthPermissions: vi.fn().mockResolvedValue(undefined),
    readRecords: vi.fn().mockResolvedValue({ records: [{
      type: 'Steps',
      count: 4200,
      startTime: new Date('2026-09-20T08:00:00Z'),
      endTime: new Date('2026-09-20T09:00:00Z'),
      metadata: { id: 'health-record-1' },
    }] }),
  };
}

describe('HealthConnectConnector', () => {
  it('requests permissions and reports connected status', async () => {
    const fakeProvider = provider();
    const connector = new HealthConnectConnector(fakeProvider);

    expect(await connector.connect()).toEqual({ success: true, message: 'Health Connect permissions requested.' });
    expect(await connector.getStatus()).toBe('connected');
    expect(fakeProvider.requestHealthPermissions).toHaveBeenCalledWith({ read: ['Steps'], write: [] });
  });

  it('converts typed Steps records into source-attributed facts', async () => {
    const connector = new HealthConnectConnector(provider());
    const result = await connector.sync({}, {});

    expect(result.status).toBe('success');
    expect(result.facts).toEqual([expect.objectContaining({
      type: 'body.activity.steps',
      value: 4200,
      source: { type: 'integration', integrationId: 'health_connect' },
      meta: { externalId: 'health-record-1', unit: 'steps' },
    })]);
  });

  it('fails without fabricating data when the provider is unavailable', async () => {
    const connector = new HealthConnectConnector(null);
    const result = await connector.sync({}, { cursor: '2026-09-19T00:00:00Z' });

    expect(result.status).toBe('failed');
    expect(result.facts).toEqual([]);
    expect(result.cursor).toBe('2026-09-19T00:00:00Z');
  });
});
