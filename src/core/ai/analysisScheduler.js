/**
 * Scheduled Analysis Pipeline (§33).
 *
 * Runs passively in the background (or on app boot) to proactively
 * generate daily and weekly insights without user intervention.
 */

import { generateInsight } from './jarvisEngine.js';
import { addInsight } from '../../database/insightsRepository.js';
import { getSetting, setSetting } from '../../database/settingsRepository.js';

export async function bootstrapAnalysisScheduler() {
  // Prevent blocking the main thread during boot.
  // We wait a few seconds before doing the heavy LLM lifting.
  setTimeout(() => {
    runScheduledAnalysis().catch(err => {
      console.warn('[AnalysisScheduler] Passive analysis failed:', err);
    });
  }, 10000);
}

async function runScheduledAnalysis() {
  const today = new Date().toISOString().split('T')[0];
  const lastDailyDate = await getSetting('lastDailyAnalysisDate');

  if (lastDailyDate !== today) {
    console.log(`[AnalysisScheduler] Running passive daily analysis for ${today}...`);
    try {
      const insight = await generateInsight("Perform a daily summary. Identify today's anomalies, incomplete intentions, and any quick patterns. Keep it brief.");
      
      // Save it to the inbox
      await addInsight({
        ...insight,
        title: `Daily Summary: ${today}`,
      });
      
      await setSetting('lastDailyAnalysisDate', today);
    } catch (err) {
      // If the model fails or API key is not set, we don't throw to crash the app,
      // we just skip and let it try again later.
      console.error('[AnalysisScheduler] Daily analysis failed:', err);
    }
  }

  // We could also do weekly here based on `lastWeeklyAnalysisWeek`.
}
