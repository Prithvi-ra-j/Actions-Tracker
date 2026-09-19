import { BaseConnector } from '../BaseConnector.js';
import { HealthConnect } from 'capacitor-health-connect';

const READ_TYPES = ['Steps'];

/**
 * Health Connect connector.
 *
 * The native provider is injected so the web build never imports a native-only
 * package. Capacitor applications can pass Capacitor.Plugins.HealthConnect (or
 * an adapter with the same methods) when registering this connector.
 */
export class HealthConnectConnector extends BaseConnector {
  constructor(provider = HealthConnect) {
    super('health-connect', 'health', '1.0');
    this.provider = provider;
  }

  get name() {
    return 'health-connect';
  }

  async getStatus() {
    if (!this.provider) return 'disconnected';
    if (typeof this.provider.checkAvailability === 'function') {
      const availability = await this.provider.checkAvailability();
      if (availability?.availability !== 'Available') return 'disconnected';
    }
    if (typeof this.provider.checkHealthPermissions === 'function') {
      const status = await this.provider.checkHealthPermissions({ read: READ_TYPES, write: [] });
      return status?.hasAllPermissions ? 'connected' : 'disconnected';
    }
    return 'disconnected';
  }

  async connect() {
    if (!this.provider?.requestHealthPermissions) return { success: false, message: 'Health Connect native provider is unavailable.' };
    const availability = await this.provider.checkAvailability();
    if (availability?.availability !== 'Available') {
      return { success: false, message: `Health Connect is ${availability?.availability || 'unavailable'}.` };
    }
    const result = await this.provider.requestHealthPermissions({ read: READ_TYPES, write: [] });
    return { success: result.hasAllPermissions === true, message: 'Health Connect permissions requested.' };
  }

  async disconnect() {
    if (typeof this.provider?.revokeHealthPermissions === 'function') {
      await this.provider.revokeHealthPermissions();
    }
  }

  async sync(options = {}, syncState = {}) {
    const startedAt = new Date().toISOString();
    if (!this.provider || typeof this.provider.readRecords !== 'function') {
      return this.createSyncResult(
        'failed', 0, 0, 0, syncState.cursor || null,
        [{ message: 'Health Connect native provider is unavailable.' }], startedAt
      );
    }

    const endTime = new Date().toISOString();
    const startTime = options.startTime || syncState.cursor || new Date(Date.now() - 7 * 86400000).toISOString();
    const result = await this.provider.readRecords({
      type: 'Steps',
      timeRangeFilter: { type: 'between', startTime: new Date(startTime), endTime: new Date(endTime) },
      ascendingOrder: true,
    });
    const facts = (result?.records || []).map(record => ({
      type: 'body.activity.steps',
      value: record.count ?? 0,
      occurredAt: record.startTime || record.endTime || endTime,
      source: { type: 'integration', integrationId: 'health_connect' },
      meta: { externalId: record.metadata?.id ?? null, unit: 'steps' },
    }));

    return this.createSyncResult('success', facts.length, 0, 0, endTime, [], startedAt, facts);
  }
}
