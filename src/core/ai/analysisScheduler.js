/**
 * Scheduled Analysis Pipeline (§33).
 *
 * Runs passively in the background (or on app boot) to proactively
 * generate daily and weekly insights without user intervention.
 */

import { generateInsight } from './jarvisEngine.js';
import { addInsight } from '../../database/insightsRepository.js';
import { getSetting, setSetting } from '../../database/settingsRepository.js';
import { saveTelemetryEvent } from '../../database/telemetryRepository.js';
import { runMonthlyAudit } from './auditEngine.js';

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
    const startTime = Date.now();
    // Privacy boundary: Telemetry only records metadata, never content.
    await saveTelemetryEvent('analysis_started', today, { analysisType: 'daily', durationMs: 0 });
    
    try {
      const insight = await generateInsight("Perform a daily summary. Identify today's anomalies, incomplete intentions, and any quick patterns. Keep it brief.");
      
      // Save it to the inbox
      await addInsight({
        ...insight,
        title: `Daily Summary: ${today}`,
      });
      
      await setSetting('lastDailyAnalysisDate', today);
      await saveTelemetryEvent('analysis_completed', today, { analysisType: 'daily', durationMs: Date.now() - startTime });
    } catch (err) {
      console.error('[AnalysisScheduler] Daily analysis failed:', err);
      await saveTelemetryEvent('analysis_failed', today, { analysisType: 'daily', durationMs: Date.now() - startTime });
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

  // Monthly Audit Trigger (§32)
  const currentMonth = today.substring(0, 7); // YYYY-MM
  const lastMonthlyMonth = await getSetting('lastMonthlyAuditMonth');
  
  if (lastMonthlyMonth !== currentMonth) {
    console.log(`[AnalysisScheduler] Running monthly audit for ${currentMonth}...`);
    const startTime = Date.now();
    await saveTelemetryEvent('analysis_started', today, { analysisType: 'monthly_audit', durationMs: 0 });
    
    try {
      await runMonthlyAudit();
      await setSetting('lastMonthlyAuditMonth', currentMonth);
      await saveTelemetryEvent('analysis_completed', today, { analysisType: 'monthly_audit', durationMs: Date.now() - startTime });
    } catch (err) {
      console.error('[AnalysisScheduler] Monthly audit failed:', err);
      await saveTelemetryEvent('analysis_failed', today, { analysisType: 'monthly_audit', durationMs: Date.now() - startTime });
    }
  }
}
