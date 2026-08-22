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

const DB_NAME = 'yearendgoals';
const DB_VERSION = 3;

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
