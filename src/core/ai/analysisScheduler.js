import { localDateStr, subtractDays } from '../../helpers/dateHelpers.js';
/**
 * Scheduled Analysis Pipeline (§33).
 *
 * Passive daily and monthly analysis with deterministic fallbacks.
 */

import { generateInsight } from './jarvisEngine.js';
import { addInsight, getAllInsights } from '../../database/insightsRepository.js';
import { getSetting, setSetting } from '../../database/settingsRepository.js';
import { saveTelemetryEvent } from '../../database/telemetryRepository.js';
import { hasUserData } from '../../database/bootstrapState.js';
import { hasJarvisApiKey } from './jarvisConfig.js';
import { getAllLogs } from '../../database/logsRepository.js';
import { getAllFacts } from '../../database/factsRepository.js';
import { getAllGoals } from '../../database/goalsRepository.js';
import { getOccurrencesByDateRange } from '../../database/habitOccurrenceRepository.js';
import { detectProactiveSignals } from './proactiveDetectors.js';
import { runMonthlyAudit } from './auditEngine.js';
import { createInsightFingerprint, shouldSurfaceInsight } from './proactivePolicy.js';

async function getEmissionPolicy(today) {
  const emittedDate = await getSetting('proactiveEmissionDate');
  return {
    emittedToday: emittedDate === today ? Number(await getSetting('proactiveEmissionCount') || 0) : 0,
    budget: Number(await getSetting('jarvisNotificationBudget') || 2),
    quietHours: {
      start: Number(await getSetting('jarvisQuietStart') || 22),
      end: Number(await getSetting('jarvisQuietEnd') || 7),
    },
  };
}

async function getRecentInsightFingerprints() {
  const insights = await getAllInsights();
  return insights.slice(0, 50).map(item => item.fingerprint).filter(Boolean);
}

async function runDeterministicDailySignals(today, goals, facts, recentOccurrences) {
  const signals = detectProactiveSignals({ goals, facts, occurrences: recentOccurrences });
  const policy = await getEmissionPolicy(today);
  const recentFingerprints = await getRecentInsightFingerprints();
  let emittedToday = policy.emittedToday;
  let emitted = 0;

  for (const signal of signals.slice(0, 5)) {
    const fingerprint = createInsightFingerprint({
      type: signal.type,
      domain: signal.domain,
      period: today,
      title: signal.title,
    });
    const decision = shouldSurfaceInsight({
      severity: signal.severity,
      confidence: signal.confidence,
      fingerprint,
      recentFingerprints,
      emittedToday,
      budget: policy.budget,
      quietHours: policy.quietHours,
    });
    if (!decision.allowed) continue;

    await addInsight({
      ...signal,
      fingerprint,
      status: 'proposed',
      createdAt: new Date().toISOString(),
      deliveryPolicy: {
        budget: policy.budget,
        quietHours: policy.quietHours,
        reason: decision.reason,
      },
    });
    recentFingerprints.push(fingerprint);
    emittedToday += 1;
    emitted += 1;
  }

  if (emitted > 0) {
    await setSetting('proactiveEmissionDate', today);
    await setSetting('proactiveEmissionCount', String(emittedToday));
  }
  return emitted;
}

async function runDailyLlmAnalysis(today) {
  const startTime = Date.now();
  await saveTelemetryEvent('analysis_started', today, { analysisType: 'daily', durationMs: 0 });

  try {
    const insight = await generateInsight(
      "Perform a daily summary. Identify today's anomalies, incomplete intentions, and any quick patterns. Keep it brief."
    );
    const title = `Daily Summary: ${today}`;
    const fingerprint = createInsightFingerprint({
      type: insight.type || 'daily_summary',
      domain: insight.domain || 'general',
      period: today,
      title,
    });
    const policy = await getEmissionPolicy(today);
    const recentFingerprints = await getRecentInsightFingerprints();
    const decision = shouldSurfaceInsight({
      severity: String(insight.severity || 'LOW').toUpperCase(),
      confidence: Number(insight.confidence ?? 0.9),
      fingerprint,
      recentFingerprints,
      emittedToday: policy.emittedToday,
      budget: policy.budget,
      quietHours: policy.quietHours,
    });

    if (decision.allowed) {
      await addInsight({
        ...insight,
        title,
        fingerprint,
        deliveryPolicy: {
          budget: policy.budget,
          quietHours: policy.quietHours,
          reason: decision.reason,
        },
      });
      await setSetting('proactiveEmissionDate', today);
      await setSetting('proactiveEmissionCount', String(policy.emittedToday + 1));
    } else {
      await saveTelemetryEvent('insight_suppressed', today, {
        reason: decision.reason,
        fingerprint,
        analysisType: 'daily',
      });
    }

    await setSetting('lastDailyAnalysisDate', today);
    await saveTelemetryEvent('analysis_completed', today, {
      analysisType: 'daily',
      durationMs: Date.now() - startTime,
    });
  } catch (err) {
    console.error('[AnalysisScheduler] Daily analysis failed:', err);
    await saveTelemetryEvent('analysis_failed', today, {
      analysisType: 'daily',
      durationMs: Date.now() - startTime,
    });
    const { addLog } = await import('../../database/logsRepository.js');
    await addLog({
      axis: 'system',
      type: 'analysis_failure',
      value: 1,
      date: today,
      meta: { error: err.message || 'Unknown LLM failure' },
    });
  }
}

async function runMonthlyAuditIfEligible(today) {
  const currentMonth = today.substring(0, 7);
  const lastMonthlyMonth = await getSetting('lastMonthlyAuditMonth');
  const allLogs = await getAllLogs();
  const meaningfulLogs = allLogs.filter(log =>
    !['onboarding_assessment', 'proof_check_in'].includes(log.type)
  );
  const firstMeaningfulDate = meaningfulLogs
    .map(log => log?.date)
    .filter(date => typeof date === 'string')
    .sort()[0];
  const daysSinceFirstMeaningfulData = firstMeaningfulDate
    ? (Date.now() - new Date(`${firstMeaningfulDate}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  const auditEligible = daysSinceFirstMeaningfulData >= 30 && meaningfulLogs.length > 0;

  if (lastMonthlyMonth === currentMonth || !auditEligible) return;

  console.log(`[AnalysisScheduler] Running monthly audit for ${currentMonth}...`);
  const startTime = Date.now();
  await saveTelemetryEvent('analysis_started', today, {
    analysisType: 'monthly_audit',
    durationMs: 0,
  });
  try {
    await runMonthlyAudit();
    await setSetting('lastMonthlyAuditMonth', currentMonth);
    await saveTelemetryEvent('analysis_completed', today, {
      analysisType: 'monthly_audit',
      durationMs: Date.now() - startTime,
    });
  } catch (err) {
    console.error('[AnalysisScheduler] Monthly audit failed:', err);
    await saveTelemetryEvent('analysis_failed', today, {
      analysisType: 'monthly_audit',
      durationMs: Date.now() - startTime,
    });
  }
}

export function bootstrapAnalysisScheduler() {
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
  if (!userDataExists) {
    console.log('[AnalysisScheduler] Skipping passive analysis: user data setup incomplete.');
    return;
  }

  const today = localDateStr();
  const lastDailyDate = await getSetting('lastDailyAnalysisDate');

  if (lastDailyDate !== today) {
    const [goals, facts, recentOccurrences] = await Promise.all([
      getAllGoals(),
      getAllFacts(),
      getOccurrencesByDateRange(subtractDays(today, 7), today),
    ]);
    await runDeterministicDailySignals(today, goals, facts, recentOccurrences);

    if (!apiConfigured) {
      await setSetting('lastDailyAnalysisDate', today);
      await saveTelemetryEvent('analysis_completed', today, {
        analysisType: 'deterministic_daily',
        durationMs: 0,
      });
    } else {
      console.log(`[AnalysisScheduler] Running passive daily analysis for ${today}...`);
      await runDailyLlmAnalysis(today);
    }
  }

  await runMonthlyAuditIfEligible(today);
}
