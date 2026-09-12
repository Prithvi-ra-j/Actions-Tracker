/**
 * Base Connector Interface (§35 Connector Contract).
 *
 * All external data sources (Health, Fitness, Finance, etc.) must implement
 * this class. This decouples the core system from external API changes.
 *
 * Subclasses should implement:
 * - `connect()`
 * - `disconnect()`
 * - `getStatus()`
 * - `sync(options, syncState)`
 */

export class BaseConnector {
  /**
   * @param {string} id Unique identifier for the connector (e.g., 'google_fit')
   * @param {string} type Domain type of the connector (e.g., 'health')
   * @param {string} version Version of the connector implementation
   */
  constructor(id, type, version = '1.0') {
    this.id = id;
    this.type = type;
    this.version = version;
  }

  /**
   * Initiates connection/authentication with the external source.
   * @returns {Promise<{ success: boolean, message?: string }>}
   */
  async connect() {
    throw new Error('connect() not implemented');
  }

  /**
   * Disconnects from the external source.
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect() not implemented');
  }

  /**
   * Returns the current connection status.
   * @returns {Promise<'connected' | 'disconnected' | 'error' | 'pending'>}
   */
  async getStatus() {
    throw new Error('getStatus() not implemented');
  }

  /**
   * Performs an incremental sync to fetch new data from the external source.
   *
   * @param {object} options Optional sync options (e.g., { full: true })
   * @param {object} syncState The current syncState record for this connector (contains cursor)
   * @returns {Promise<{ status: "success"|"partial"|"failed", imported: number, updated: number, ignored: number, cursor?: string, errors?: object[], startedAt: string, completedAt: string, facts: object[] }>}
   */
  async sync(options = {}, syncState = {}) {
    throw new Error('sync() not implemented');
  }

  /**
   * Revokes access and cleans up the connection.
   * @returns {Promise<void>}
   */
  async revoke() {
    await this.disconnect();
  }

  /**
   * Helper to format a standard sync result object.
   */
  createSyncResult(status, imported, updated, ignored, cursor, errors, startedAt, facts = []) {
    return {
      status,
      imported,
      updated,
      ignored,
      cursor,
      errors,
      startedAt,
      completedAt: new Date().toISOString(),
      facts // The raw facts produced by this sync run (to be ingested by syncManager)
    };
  }
}
