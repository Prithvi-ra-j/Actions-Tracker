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
import { hasUserData } from '../../database/bootstrapState.js';
import { hasJarvisApiKey } from './jarvisConfig.js';
import { getAllLogs } from '../../database/logsRepository.js';
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
  if ((await getSetting('jarvisProactiveSuggestions')) === 'false') {
    console.log('[AnalysisScheduler] Skipping passive analysis: disabled in Settings.');
    return;
  }

  const [userDataExists, apiConfigured] = await Promise.all([
    hasUserData(),
    hasJarvisApiKey(),
  ]);

  if (!userDataExists || !apiConfigured) {
    console.log('[AnalysisScheduler] Skipping passive analysis: user data/API setup incomplete.');
    return;
  }

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
  // Do not generate an audit for a fresh install. The user must have
  // completed onboarding, accumulated real evidence, and had the system
  // running long enough for a 30-day period to be meaningful.
  const currentMonth = today.substring(0, 7); // YYYY-MM
  const lastMonthlyMonth = await getSetting('lastMonthlyAuditMonth');
  const allLogs = await getAllLogs();

  const meaningfulLogs = allLogs.filter(l =>
    !['onboarding_assessment', 'proof_check_in'].includes(l.type)
  );

  const firstMeaningfulDate = meaningfulLogs
    .map(log => log?.date)
    .filter(date => typeof date === 'string')
    .sort()[0];

  const daysSinceFirstMeaningfulData = firstMeaningfulDate
    ? (Date.now() - new Date(firstMeaningfulDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)
    : 0;

  const auditEligible =
    daysSinceFirstMeaningfulData >= 30 &&
    meaningfulLogs.length > 0;

  if (lastMonthlyMonth !== currentMonth && auditEligible) {
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
