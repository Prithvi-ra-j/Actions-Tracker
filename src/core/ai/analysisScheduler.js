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
      console.error('[AnalysisScheduler] Daily analysis failed:', err);
      // §115 Recovery Strategy: Log failure explicitly, do not overwrite valid state.
      const { addLog } = await import('../../database/logsRepository.js');
      await addLog({
        axis: 'system',
        type: 'analysis_failure',
        value: 1,
        date: today,
        meta: { error: err.message || 'Unknown LLM failure' }
      });
      // We do NOT set lastDailyAnalysisDate, meaning it will naturally retry on next boot.
    }
  }

  // We could also do weekly here based on `lastWeeklyAnalysisWeek`.
}
