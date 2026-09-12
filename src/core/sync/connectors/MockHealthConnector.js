import { BaseConnector } from '../BaseConnector.js';
import { createFact } from '../../../models/factSchema.js';

/**
 * Mock Health Connector.
 * Simulates fetching steps and sleep from an external source.
 * In a real app, this would use Capacitor Health/Fitness plugins.
 */
export class MockHealthConnector extends BaseConnector {
  constructor() {
    super('mock_health', 'health', '1.0');
    this._connected = true; // Pretend we're always connected for testing
  }

  async connect() {
    this._connected = true;
    return { success: true };
  }

  async disconnect() {
    this._connected = false;
  }

  async getStatus() {
    return this._connected ? 'connected' : 'disconnected';
  }

  async sync(options = {}, syncState = {}) {
    const startedAt = new Date().toISOString();
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // We'll generate a random number of steps and sleep hours for "today"
    // In a real connector, you'd fetch from `syncState.cursor` up to now.
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Check if we already synced today (mock logic uses cursor as date)
    if (syncState.cursor === todayStr && !options.full) {
      return this.createSyncResult('success', 0, 0, 0, syncState.cursor, [], startedAt, []);
    }

    const stepsFact = createFact({
      type: 'body.activity.steps',
      objectId: 'user',
      value: { amount: Math.floor(Math.random() * 5000) + 3000, unit: 'steps' },
      source: { type: 'health_connect', connectorId: this.id },
      occurredAt: startedAt,
      recordedAt: startedAt,
      localDate: todayStr,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    const sleepFact = createFact({
      type: 'body.recovery.sleep',
      objectId: 'user',
      value: { amount: Math.floor(Math.random() * 3) + 5, unit: 'hours' },
      source: { type: 'health_connect', connectorId: this.id },
      occurredAt: startedAt,
      recordedAt: startedAt,
      localDate: todayStr,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    const newFacts = [stepsFact, sleepFact];

    return this.createSyncResult(
      'success',
      newFacts.length,
      0,
      0,
      todayStr, // next cursor
      [],
      startedAt,
      newFacts
    );
  }
}
