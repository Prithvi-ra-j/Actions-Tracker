import { BaseConnector } from '../BaseConnector.js';

/**
 * Production connector for Android Health Connect (or iOS HealthKit).
 * 
 * Note: Capacitor native plugin integration is required. 
 * This stub strictly throws an UnimplementedError rather than producing mock data,
 * satisfying the architectural invariant that mock connectors are not allowed in production.
 */
export class HealthConnectConnector extends BaseConnector {
  get name() {
    return 'health-connect';
  }

  async checkStatus() {
    // Attempt to communicate with native bridge here.
    return {
      connected: false,
      lastSync: null,
      error: 'Native capacitor-health-connect plugin is not installed or configured.'
    };
  }

  async connect() {
    throw new Error('Native health connector is not implemented in this environment.');
  }

  async fetchLogs(period) {
    throw new Error('Native health connector is not implemented in this environment.');
  }
}
