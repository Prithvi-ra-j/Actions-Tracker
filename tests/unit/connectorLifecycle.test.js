import { describe, expect, it } from 'vitest';
import { deriveConnectorLifecycle } from '../../src/core/sync/connectorLifecycle.js';

describe('connector lifecycle', () => {
  it('maps connection and sync state into user-facing lifecycle states', () => {
    expect(deriveConnectorLifecycle('pending')).toBe('connecting');
    expect(deriveConnectorLifecycle('connected', { status: 'syncing' })).toBe('syncing');
    expect(deriveConnectorLifecycle('connected', { status: 'error' })).toBe('sync_failed');
    expect(deriveConnectorLifecycle('connected', { status: 'idle', lastSuccessfulSync: '2026-09-28T08:00:00Z' })).toBe('synced');
    expect(deriveConnectorLifecycle('disconnected')).toBe('disconnected');
  });
});
