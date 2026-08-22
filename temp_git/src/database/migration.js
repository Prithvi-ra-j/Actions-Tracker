/**
 * One-time migration from the original localStorage structure to IndexedDB.
 *
 * The old app stored data under these localStorage keys:
 *   yearEndGoals.daily    — { "YYYY-MM-DD": { body, philosophy, art, history } }
 *   yearEndGoals.checked  — { "gi-ti": boolean }
 *   yearEndGoals.mChecked — { "m-mi-ti": boolean }
 *
 * Migration runs exactly once, on first launch of the new version.
 * A settings flag 'migrated_from_localStorage' is set to '1' when complete.
 *
 * If migration fails, it is retried on the next launch (the flag is only set
 * after all data has been successfully written).
 *
 * localStorage is NOT deleted after migration to preserve a safety backup.
 */

import { saveDailyRecord } from './dailyRepository.js';
import { setGoalCheck } from './goalsRepository.js';
import { setMilestoneCheck } from './milestonesRepository.js';
import { getSetting, setSetting } from './settingsRepository.js';

/**
 * Attempts to migrate existing localStorage data into IndexedDB.
 * Safe to call on every launch — exits immediately if already migrated.
 */
export async function migrateFromLocalStorage() {
  // Bail out early if already migrated
  const alreadyDone = await getSetting('migrated_from_localStorage');
  if (alreadyDone === '1') return;

  let migratedAny = false;

  try {
    // ── Daily records ──────────────────────────────────────────────────────────
    const dailyRaw = safeGet('yearEndGoals.daily');
    if (dailyRaw) {
      const daily = JSON.parse(dailyRaw);
      for (const [date, tasks] of Object.entries(daily)) {
        if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        await saveDailyRecord(date, {
          body:        !!tasks.body,
          philosophy:  !!tasks.philosophy,
          art:         !!tasks.art,
          history:     !!tasks.history,
        });
        migratedAny = true;
      }
    }

    // ── Goal checks ────────────────────────────────────────────────────────────
    const checkedRaw = safeGet('yearEndGoals.checked');
    if (checkedRaw) {
      const checked = JSON.parse(checkedRaw);
      for (const [key, value] of Object.entries(checked)) {
        await setGoalCheck(key, !!value);
        migratedAny = true;
      }
    }

    // ── Milestone checks ───────────────────────────────────────────────────────
    const mCheckedRaw = safeGet('yearEndGoals.mChecked');
    if (mCheckedRaw) {
      const mChecked = JSON.parse(mCheckedRaw);
      for (const [key, value] of Object.entries(mChecked)) {
        await setMilestoneCheck(key, !!value);
        migratedAny = true;
      }
    }

    // ── Mark complete ──────────────────────────────────────────────────────────
    await setSetting('migrated_from_localStorage', '1');
    if (migratedAny) {
      console.log('[Migration] localStorage → IndexedDB migration complete.');
    }
  } catch (err) {
    // Don't mark complete — will retry next launch
    console.error('[Migration] Failed (will retry on next launch):', err);
  }
}

// ─── Helper ────────────────────────────────────────────────────────────────────

function safeGet(key) {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}
