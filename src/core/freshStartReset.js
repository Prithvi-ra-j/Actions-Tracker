import { Filesystem, Directory } from '@capacitor/filesystem';
import { clearAllDatabaseData } from '../database/db.js';
import { setSetting } from '../database/settingsRepository.js';
import { clearSecureValue } from '../native/secureStorage.js';

const RESET_MARKER = 'actions_tracker_fresh_start_2026_09_26';

function clearLegacyLocalStorage() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (
        key === 'yearEndGoals.daily' ||
        key === 'yearEndGoals.checked' ||
        key === 'yearEndGoals.mChecked' ||
        key?.startsWith('actions_tracker_')
      ) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
  } catch {
    // Storage may be unavailable in some environments; the IndexedDB reset
    // remains authoritative.
  }
}

async function clearBackups() {
  try {
    const listing = await Filesystem.readdir({
      path: '',
      directory: Directory.Documents,
    });

    const backupFiles = (listing.files || [])
      .map(file => file.name)
      .filter(name =>
        name === 'ActionsTracker_Latest_Backup.json' ||
        /^ActionsTracker_Backup_\d{4}-\d{2}-\d{2}\.json$/.test(name)
      );

    await Promise.all(
      backupFiles.map(name =>
        Filesystem.deleteFile({
          path: name,
          directory: Directory.Documents,
        }).catch(() => {})
      )
    );
  } catch {
    // Browser/dev builds or unavailable Documents storage are non-fatal.
  }
}

/**
 * Performs the fresh-start reset exactly once for the current release baseline.
 * Returns true only on the launch where the reset was actually applied.
 */
export async function applyFreshStartReset() {
  if (typeof localStorage !== 'undefined' && localStorage.getItem(RESET_MARKER) === '1') {
    return false;
  }

  await clearAllDatabaseData();
  await clearSecureValue('aiApiKey').catch(() => {});
  clearLegacyLocalStorage();
  await clearBackups();

  // Prevent the old localStorage migration from recreating the previous data
  // after the database has been wiped.
  await setSetting('migrated_from_localStorage', '1');

  try {
    localStorage.setItem(RESET_MARKER, '1');
  } catch {
    // A later launch may repeat the reset if storage is unavailable. That is
    // preferable to accidentally restoring the old dataset.
  }

  return true;
}
