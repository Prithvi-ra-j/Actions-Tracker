/**
 * Settings repository.
 *
 * Schema for each record in the 'settings' object store:
 * {
 *   key:   string  — setting name
 *   value: string  — always stored as a string; parse as needed
 * }
 */

import { dbGet, dbPut, dbGetAll } from './db.js';

// ─── Generic key/value ─────────────────────────────────────────────────────────

/**
 * Gets a setting value by key. Returns null if not found.
 * @param {string} key
 * @returns {Promise<string|null>}
 */
export async function getSetting(key) {
  const row = await dbGet('settings', key);
  return row ? row.value : null;
}

/**
 * Saves a setting value. The value is coerced to a string.
 * @param {string} key
 * @param {string|number|boolean} value
 */
export async function setSetting(key, value) {
  await dbPut('settings', { key, value: String(value) });
}

/**
 * Returns all settings as { key: value } (values are strings).
 */
export async function getAllSettings() {
  const rows = await dbGetAll('settings');
  const map = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

// ─── Reminder configuration ────────────────────────────────────────────────────

/**
 * Default reminder configuration.
 * Matches NOTIFICATION_IDS in notifications.js.
 */
const DEFAULT_REMINDERS = [
  { id: 1, label: 'BODY',        time: '07:00', enabled: true },
  { id: 2, label: 'PHILOSOPHY',  time: '20:30', enabled: true },
  { id: 3, label: 'DAILY CHECK', time: '22:00', enabled: true },
];

/**
 * Returns the saved reminder configuration, or defaults if not yet configured.
 * @returns {Promise<Array<{id: number, label: string, time: string, enabled: boolean}>>}
 */
export async function getReminders() {
  const raw = await getSetting('reminders');
  if (!raw) return DEFAULT_REMINDERS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_REMINDERS;
  } catch {
    return DEFAULT_REMINDERS;
  }
}

/**
 * Persists the reminder configuration.
 * @param {Array} reminders
 */
export async function saveReminders(reminders) {
  await setSetting('reminders', JSON.stringify(reminders));
}
