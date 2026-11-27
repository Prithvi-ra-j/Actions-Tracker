import { LIFE_DIMENSIONS } from '../../constants.js';
import { dbGetAll } from '../../database/db.js';
import { getAllHabits } from '../../database/habitRepository.js';
import { getAllLogs } from '../../database/logsRepository.js';
import { getAllSettings } from '../../database/settingsRepository.js';
import { getAllFacts } from '../../database/factsRepository.js';
import { getSelfModel } from '../../database/selfModelRepository.js';
import { getAllGoals } from '../../database/goalsRepository.js';
import { localDateStr } from '../../helpers/dateHelpers.js';
import { computeGrowthOverview } from './baselineEngine.js';

export async function loadGrowthOverview(today) {
  const [habits, occurrences, logs, settings, selfModel, facts, goals] = await Promise.all([
    getAllHabits(), dbGetAll('habitOccurrences'), getAllLogs(), getAllSettings(),
    getSelfModel(), getAllFacts(), getAllGoals(),
  ]);
  const startedAt = selfModel.onboardingCompletedAt;
  const startedOn = startedAt && Number.isFinite(Date.parse(startedAt)) ? localDateStr(new Date(startedAt)) : null;
  const restDays = Object.keys(settings).filter(key => key.startsWith('restDay:') && settings[key] === 'true')
    .map(key => key.slice('restDay:'.length));
  const controls = {};
  for (const axis of LIFE_DIMENSIONS) {
    const raw = settings[`calibration:${axis.key}`];
    if (!raw) continue;
    const control = JSON.parse(raw);
    if (!control || typeof control !== 'object' || !Array.isArray(control.pauses) ||
        !Array.isArray(control.history)) throw new Error(`Invalid calibration settings for ${axis.key}.`);
    controls[axis.key] = control;
  }
  const overview = computeGrowthOverview({ habits, occurrences, logs, facts, goals, restDay: settings.restDay,
    restDays, calibration: controls, today, startedOn });
  return { overview, controls, settings };
}
