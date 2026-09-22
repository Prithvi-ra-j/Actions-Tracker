import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { dbGetAll, exportDatabase, importDatabase } from './db.js';
import { getSetting, setSetting } from './settingsRepository.js';

const LATEST_BACKUP_FILE = 'ActionsTracker_Latest_Backup.json';
const USER_DATA_STORES = [
  'goals', 'milestones', 'logs', 'axis_config', 'books', 'gymSessions',
  'questBoard', 'statSnapshots', 'facts', 'lifeObjects', 'selfModel',
  'habits', 'habitOccurrences', 'learnings', 'evidence', 'relations',
  'memories', 'audits', 'insights', 'decisions', 'experiments',
  'creativeWorks', 'observations', 'routineConfig', 'jarvisConversations',
];

/**
 * Returns true when the IndexedDB database contains no user data.
 * This is intentionally checked before migrations/seeders so a restored backup
 * becomes the source of truth rather than being mixed with a fresh install.
 */
async function isDatabaseEmpty() {
  const counts = await Promise.all(
    USER_DATA_STORES.map(async store => {
      try {
        return (await dbGetAll(store)).length;
      } catch {
        return 0;
      }
    })
  );
  return counts.every(count => count === 0);
}

/**
 * Writes the latest full database snapshot to shared Documents storage.
 * This file is deliberately separate from the dated history so the app can
 * restore itself after a reinstall or a debug → release transition.
 */
async function writeLatestBackup(backupData) {
  await Filesystem.writeFile({
    path: LATEST_BACKUP_FILE,
    data: backupData,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
  });
}

/**
 * Runs the automatic backup.
 *
 * Normal launches create one dated backup per day and always refresh the
 * single "Latest" snapshot. Forced backups are used after high-value writes
 * such as onboarding completion and do not wait for the daily timer.
 */
export async function runAutoBackup({ force = false } = {}) {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastBackupDate = await getSetting('lastAutoBackupDate');
    const backupData = await exportDatabase();

    // Always refresh the latest snapshot so the recovery point contains the
    // most recent onboarding/system state, not yesterday's state.
    await writeLatestBackup(backupData);

    if (force || lastBackupDate !== todayStr) {
      const fileName = `ActionsTracker_Backup_${todayStr}.json`;
      await Filesystem.writeFile({
        path: fileName,
        data: backupData,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      await setSetting('lastAutoBackupDate', todayStr);
      console.log(`[BackupService] Created backup: ${fileName}${force ? ' (forced)' : ''}`);
    }
  } catch (error) {
    console.error('[BackupService] Auto-backup failed:', error);
  }
}

/**
 * Restores the newest backup only when the IndexedDB database is genuinely
 * empty. Existing data is never overwritten automatically.
 *
 * This protects the local-first app from data loss when the app was removed
 * and reinstalled, or when the user transitions from an unsigned/debug APK
 * to the signed release APK.
 */
export async function restoreLatestBackupIfDatabaseEmpty() {
  try {
    if (!(await isDatabaseEmpty())) {
      return { restored: false, reason: 'database_not_empty' };
    }

    const candidates = [LATEST_BACKUP_FILE];

    // Backward compatibility with backups produced before the Latest snapshot
    // existed: fall back to the newest dated backup in Documents.
    try {
      const listing = await Filesystem.readdir({
        path: '',
        directory: Directory.Documents,
      });
      const dated = (listing.files || [])
        .map(file => file.name)
        .filter(name => /^ActionsTracker_Backup_\d{4}-\d{2}-\d{2}\.json$/.test(name))
        .sort()
        .reverse();
      candidates.push(...dated);
    } catch {
      // Documents may be unavailable; the fixed latest file is still attempted.
    }

    for (const fileName of candidates) {
      try {
        const file = await Filesystem.readFile({
          path: fileName,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        if (!file?.data) continue;

        const result = await importDatabase(file.data);
        const totalRecords = Object.values(result.counts || {})
          .reduce((sum, count) => sum + Number(count || 0), 0);

        if (totalRecords === 0) continue;

        await setSetting('restoredFromBackupAt', new Date().toISOString());
        await setSetting('restoredFromBackupFile', fileName);
        console.log(`[BackupService] Restored ${totalRecords} records from ${fileName}`);
        return { restored: true, fileName, counts: result.counts };
      } catch (error) {
        console.warn(`[BackupService] Backup candidate ${fileName} could not be restored:`, error);
      }
    }

    return { restored: false, reason: 'no_valid_backup' };
  } catch (error) {
    console.error('[BackupService] Automatic restore failed:', error);
    return { restored: false, reason: 'restore_error', error };
  }
}

