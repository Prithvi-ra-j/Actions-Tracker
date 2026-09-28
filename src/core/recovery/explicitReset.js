import { clearAllDatabaseData } from '../../database/db.js';
import { clearSecureValue } from '../../native/secureStorage.js';
import { setAppMeta } from '../../database/appMetaRepository.js';

const INSTALLATION_META_KEY = 'installationBaseline';

export async function explicitResetAllData({ clearBackups = async () => {} } = {}) {
  await clearAllDatabaseData();
  await clearSecureValue('aiApiKey').catch(() => {});
  try {
    const keys = [];
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key?.startsWith('actions_tracker_') || key?.startsWith('yearEndGoals.')) keys.push(key);
      }
      keys.forEach(key => localStorage.removeItem(key));
    }
  } catch {}
  await clearBackups().catch(() => {});

  await setAppMeta(INSTALLATION_META_KEY, {
    release: 'explicit-reset',
    createdAt: new Date().toISOString(),
    resetApplied: true,
    explicitReset: true,
  });

  return { reset: true, restartedAt: new Date().toISOString() };
}
