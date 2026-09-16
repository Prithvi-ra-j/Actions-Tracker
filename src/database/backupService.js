import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { exportDatabase } from './db.js';
import { getSetting, setSetting } from './settingsRepository.js';

/**
 * Runs an automatic daily backup of the database to the device's Documents folder.
 */
export async function runAutoBackup() {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastBackupDate = await getSetting('lastAutoBackupDate');

    if (lastBackupDate === todayStr) {
      // Already backed up today
      return;
    }

    const backupData = await exportDatabase();
    
    // Save to the Documents directory on Android
    const fileName = `ActionsTracker_Backup_${todayStr}.json`;
    await Filesystem.writeFile({
      path: fileName,
      data: backupData,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });

    await setSetting('lastAutoBackupDate', todayStr);
    console.log(`[BackupService] Successfully created daily auto-backup: ${fileName}`);
  } catch (error) {
    console.error('[BackupService] Auto-backup failed:', error);
  }
}
