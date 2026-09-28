import { getAllFacts } from '../../database/factsRepository.js';
import { getAllBaselines } from './baselineRepository.js';
import { detectDeviation } from './deviationDetector.js';
import { calculateTrend } from './trendEngine.js';

const OBSERVATION_TYPE = 'calibration.observation';

function groupObservations(facts) {
  const groups = new Map();
  for (const fact of facts) {
    if (fact.type !== OBSERVATION_TYPE || !fact.objectId) continue;
    const list = groups.get(fact.objectId) || [];
    list.push({
      id: fact.id,
      value: Number(fact.value),
      occurredAt: fact.occurredAt || fact.recordedAt,
      evidenceId: fact.meta?.evidenceId || null,
    });
    groups.set(fact.objectId, list);
  }
  return groups;
}

/**
 * Rebuilds current baseline signals from the append-only observation ledger.
 * This is intentionally read-only: callers can persist notifications/insights
 * separately without mutating the calibration source data.
 */
export async function getBaselineSignals({ now = new Date(), zThreshold = 1 } = {}) {
  const [facts, baselines] = await Promise.all([getAllFacts(), getAllBaselines()]);
  const grouped = groupObservations(facts);
  const signals = [];

  for (const [metric, observations] of grouped.entries()) {
    const baseline = baselines[metric];
    if (!baseline || !observations.length) continue;

    const latest = [...observations]
      .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))
      .at(-1);

    const deviation = detectDeviation(metric, latest.value, baseline, { zThreshold });
    const trend = calculateTrend(observations);

    if (deviation) {
      signals.push({
        ...deviation,
        trend,
        generatedAt: now.toISOString(),
        evidence: {
          ...deviation.evidence,
          observationId: latest.id,
          supportingEvidenceId: latest.evidenceId,
        },
      });
    }
  }

  return signals.sort((a, b) => {
    const severityRank = { high: 3, medium: 2, normal: 1, unknown: 0 };
    return (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
  });
}
