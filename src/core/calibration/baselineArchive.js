import { writeSequence } from '../../database/db.js';
import { parseLocalDate, subtractDays } from '../../helpers/dateHelpers.js';

export async function archiveBaselines(overview, today) {
  const date = parseLocalDate(today);
  if (!date) throw new Error('Invalid baseline archive date.');
  const week = subtractDays(today, (date.getDay() + 6) % 7);
  await writeSequence(['settings'], tx => {
    const store = tx.objectStore('settings');
    for (const [axis, item] of Object.entries(overview.attributes)) {
      if (item.paused || item.baseline === null) continue;
      const key = `baselineSnapshot:${axis}:${item.calibrationSince || 'history'}:${week}`;
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result) return;
        store.add({ key, value: JSON.stringify({
          axis, week, savedOn: today, since: item.calibrationSince,
          baseline: item.baseline, spread: item.spread, activeDays: item.activeDays, activeWeeks: item.activeWeeks,
        }) });
      };
    }
  });
}
