/**
 * IndexedDB database layer.
 *
 * Works in both environments:
 *   Browser (dev)   → standard IndexedDB
 *   Android (prod)  → Android WebView IndexedDB, stored in the app's
 *                     private data directory — persistent, offline, private.
 *
 * Four object stores:
 *   daily       — daily task records, keyed by "YYYY-MM-DD"
 *   goals       — goal target checkbox states, keyed by "gi-ti"
 *   milestones  — milestone task checkbox states, keyed by "m-mi-ti"
 *   settings    — arbitrary key/value pairs
 */

const DB_NAME = 'actions-tracker';
const DB_VERSION = 6;

/** @type {IDBDatabase|null} */
let _db = null;

// ─── Initialization ────────────────────────────────────────────────────────────

/**
 * Opens (or creates) the IndexedDB database.
 * Safe to call multiple times — returns the existing connection on subsequent calls.
 * @returns {Promise<IDBDatabase>}
 */
export function initDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`IndexedDB open failed: ${request.error?.message ?? 'unknown'}`));
    };

    request.onsuccess = () => {
      _db = request.result;

      // Log errors that occur after the initial open
      _db.onerror = (ev) => {
        console.error('[DB] Unhandled IDB error:', ev.target?.error);
      };

      resolve(_db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('daily')) {
        db.createObjectStore('daily', { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains('goals')) {
        db.createObjectStore('goals', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('milestones')) {
        db.createObjectStore('milestones', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // Phase 1: New Stores
      if (!db.objectStoreNames.contains('logs')) {
        const logsStore = db.createObjectStore('logs', { keyPath: 'id' });
        logsStore.createIndex('date', 'date', { unique: false });
        logsStore.createIndex('axis', 'axis', { unique: false });
      }
      if (!db.objectStoreNames.contains('axis_config')) {
        db.createObjectStore('axis_config', { keyPath: 'axis' });
      }
      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('gymSessions')) {
        db.createObjectStore('gymSessions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('questBoard')) {
        db.createObjectStore('questBoard', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('statSnapshots')) {
        const ss = db.createObjectStore('statSnapshots', { keyPath: 'id' });
        ss.createIndex('date', 'date', { unique: false });
      }

      // v1.1: Fact/Event Ledger (§30 Facts, §31 Event Ledger)
      if (!db.objectStoreNames.contains('facts')) {
        const factsStore = db.createObjectStore('facts', { keyPath: 'id' });
        factsStore.createIndex('objectId',  'objectId',  { unique: false });
        factsStore.createIndex('type',      'type',      { unique: false });
        factsStore.createIndex('localDate', 'localDate', { unique: false });
      }

      // v1.1: Life Object Model (§26 Life Object Model)
      if (!db.objectStoreNames.contains('lifeObjects')) {
        const loStore = db.createObjectStore('lifeObjects', { keyPath: 'id' });
        loStore.createIndex('type',   'type',   { unique: false });
        loStore.createIndex('status', 'status', { unique: false });
      }

      // v2.1: Self Model (§3–§6 Self/Current/Desired/Gap Models)
      // Singleton store — one record keyed 'primary' per user.
      if (!db.objectStoreNames.contains('selfModel')) {
        db.createObjectStore('selfModel', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Returns the open database connection.
 * Throws if initDB() has not been called and resolved yet.
 */
export function getDB() {
  if (!_db) {
    throw new Error('Database is not initialised. Await initDB() before calling getDB().');
  }
  return _db;
}

// ─── Low-level IDB helpers ─────────────────────────────────────────────────────
// Repository modules use these instead of duplicating transaction boilerplate.

/**
 * Retrieves a single record by key from an object store.
 * Returns null if not found.
 * @param {string} storeName
 * @param {IDBValidKey} key
 * @returns {Promise<any|null>}
 */
export function dbGet(storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = getDB().transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Inserts or updates a record in an object store.
 * @param {string} storeName
 * @param {object} value  Must contain the store's keyPath field.
 * @returns {Promise<IDBValidKey>}
 */
export function dbPut(storeName, value) {
  return new Promise((resolve, reject) => {
    const tx = getDB().transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Returns all records in an object store.
 * @param {string} storeName
 * @returns {Promise<any[]>}
 */
export function dbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const tx = getDB().transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Returns all records whose key falls within [lowerKey, upperKey] (inclusive).
 * Works for string keys in lexicographic order — perfect for "YYYY-MM-DD" dates.
 * @param {string} storeName
 * @param {IDBValidKey} lowerKey
 * @param {IDBValidKey} upperKey
 * @returns {Promise<any[]>}
 */
export function dbGetRange(storeName, lowerKey, upperKey) {
  return new Promise((resolve, reject) => {
    const tx = getDB().transaction(storeName, 'readonly');
    const range = IDBKeyRange.bound(lowerKey, upperKey);
    const req = tx.objectStore(storeName).getAll(range);
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Returns all records from an index matching a specific key.
 * @param {string} storeName
 * @param {string} indexName
 * @param {any} key
 * @returns {Promise<any[]>}
 */
export function dbGetAllByIndex(storeName, indexName, key) {
  return new Promise((resolve, reject) => {
    const tx = getDB().transaction(storeName, 'readonly');
    const index = tx.objectStore(storeName).index(indexName);
    const req = index.getAll(key);
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

// ─── Data Safety ─────────────────────────────────────────────────────────────

// All stores included in export/import — add new stores here as they are created.
const ALL_STORES = [
  'daily', 'goals', 'milestones', 'settings',
  'logs', 'axis_config', 'books', 'gymSessions',
  'questBoard', 'statSnapshots',
  'facts', 'lifeObjects',             // v1.1
  'selfModel',                        // v2.1
];

/**
 * Exports all stores to a JSON string with a _meta envelope.
 * The _meta field carries export timestamp, app version, and schema version
 * so imports can validate compatibility before overwriting data.
 * @returns {Promise<string>} JSON string
 */
export async function exportDatabase() {
  const data = {};
  for (const store of ALL_STORES) {
    try {
      data[store] = await dbGetAll(store);
    } catch {
      data[store] = [];
    }
  }
  return JSON.stringify({
    _meta: {
      exportedAt:    new Date().toISOString(),
      appVersion:    '2.0.0',
      schemaVersion: 1,
      stores:        ALL_STORES,
    },
    ...data,
  });
}

/**
 * Imports all stores from a JSON string produced by exportDatabase().
 * Strips the _meta envelope before processing.
 * Clears each store and re-populates with the imported records so the
 * result is an exact mirror of the exported state.
 * @param {string} jsonString
 * @returns {Promise<void>}
 */
export function importDatabase(jsonString) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = JSON.parse(jsonString);
      // Strip _meta if present — it's informational, not a store
      const { _meta: _ignored, ...data } = parsed;

      // Only import stores that currently exist in the DB schema.
      // Unknown stores from future versions are silently skipped.
      const storesToImport = ALL_STORES.filter(s => s in data);
      const tx = getDB().transaction(storesToImport, 'readwrite');

      tx.oncomplete = () => resolve();
      tx.onerror   = () => reject(tx.error);

      storesToImport.forEach(store => {
        const os = tx.objectStore(store);
        os.clear(); // Exact mirror — wipe then repopulate
        (data[store] ?? []).forEach(item => os.put(item));
      });
    } catch (err) {
      reject(err);
    }
  });
}
