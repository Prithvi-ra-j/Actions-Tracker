import { Filesystem, Directory } from '@capacitor/filesystem';
import { clearAllDatabaseData, dbGet } from '../database/db.js';
import { setSetting } from '../database/settingsRepository.js';
import { setAppMeta } from '../database/appMetaRepository.js';
import { clearSecureValue } from '../native/secureStorage.js';

const RESET_RELEASE = '2026-09-26';
const RESET_MARKER = `actions_tracker_fresh_start_${RESET_RELEASE}`;
const INSTALLATION_META_KEY = 'installationBaseline';

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
      ) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage may be unavailable; IndexedDB remains authoritative.
  }
}

async function clearBackups() {
  try {
    const listing = await Filesystem.readdir({ path: '', directory: Directory.Documents });
    const backupFiles = (listing.files || [])
      .map((file) => file.name)
      .filter((name) =>
        name === 'ActionsTracker_Latest_Backup.json' ||
        /^ActionsTracker_Backup_\d{4}-\d{2}-\d{2}\.json$/.test(name)
      );

    await Promise.all(
      backupFiles.map((name) =>
        Filesystem.deleteFile({ path: name, directory: Directory.Documents }).catch(() => {})
      )
    );
  } catch {
    // Browser/dev builds or unavailable Documents storage are non-fatal.
  }
}

/**
 * Historical reset for the 2026-09-26 release baseline.
 *
 * Fail closed for any installation that already has a durable appMeta baseline.
 * This prevents later launches/releases from accidentally replaying a destructive
 * reset when localStorage has been cleared or is unavailable.
 */
export async function applyFreshStartReset() {
  let marker = null;
  let hasInstallationBaseline = false;

  try {
    marker = typeof localStorage !== 'undefined' ? localStorage.getItem(RESET_MARKER) : null;
  } catch {
    marker = null;
  }

  try {
    const meta = await dbGet('appMeta', INSTALLATION_META_KEY);
    hasInstallationBaseline = Boolean(meta);
  } catch {
    // If the metadata store cannot be read, do not risk a destructive reset.
    hasInstallationBaseline = true;
  }

  if (marker === '1' || hasInstallationBaseline) return false;

  await clearAllDatabaseData();
  await clearSecureValue('aiApiKey').catch(() => {});
  clearLegacyLocalStorage();
  await clearBackups();

  await setSetting('migrated_from_localStorage', '1');

  // Durable guard first; localStorage is only a fast-path marker.
  await setAppMeta(INSTALLATION_META_KEY, {
    release: RESET_RELEASE,
    createdAt: new Date().toISOString(),
    resetApplied: true,
  });

  try {
    localStorage.setItem(RESET_MARKER, '1');
  } catch {
    // IndexedDB baseline remains authoritative.
  }

  return true;
}
