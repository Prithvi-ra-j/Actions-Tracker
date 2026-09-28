import { localDateStr, subtractDays } from '../../helpers/dateHelpers.js';

export function detectGoalStagnation(goals = [], facts = [], { now = new Date(), windowDays = 8 } = {}) {
  const cutoff = subtractDays(localDateStr(now), windowDays);
  return goals
    .filter(goal => goal?.status === 'active')
    .filter(goal => Number(goal.progress || 0) < Number(goal.targetProgress || 1))
    .filter(goal => {
      const related = facts.filter(fact => fact.objectId === goal.id && fact.type !== 'retraction');
      return related.filter(fact => String(fact.localDate || '') >= cutoff).length === 0;
    })
    .map(goal => ({
      type: 'goal_stagnation',
      domain: goal.domain || goal.axis || 'general',
      severity: 'MEDIUM',
      confidence: 0.9,
      title: `Goal stalled: ${goal.title || goal.label}`,
      summary: `No supporting evidence was recorded for this active goal in the last ${windowDays} days.`,
      evidence: { goalId: goal.id, windowDays },
      suggestedAction: 'Review the goal, measurement path, or next action.',
    }));
}

export function detectMissedHabits(occurrences = [], { windowDays = 7 } = {}) {
  const missed = occurrences.filter(item => item?.status === 'missed');
  if (missed.length < 2) return [];
  return [{
    type: 'repeated_missed_habit',
    domain: 'discipline',
    severity: missed.length >= 4 ? 'HIGH' : 'MEDIUM',
    confidence: Math.min(1, 0.55 + missed.length * 0.08),
    title: 'Repeated habit misses',
    summary: `${missed.length} scheduled habit occurrences were marked missed in the recent window.`,
    evidence: { missedCount: missed.length, windowDays },
    suggestedAction: 'Review timing, capacity, or whether the habit still fits.',
  }];
}

export function detectEvidenceGap(axisDetails = {}) {
  return Object.entries(axisDetails)
    .filter(([, detail]) => Number(detail?.confidence || 0) < 0.35 && Number(detail?.coverage || 0) < 0.35)
    .map(([axis]) => ({
      type: 'evidence_gap',
      domain: axis,
      severity: 'LOW',
      confidence: 0.95,
      title: `Evidence gap: ${axis}`,
      summary: `There is not enough recent evidence to interpret ${axis} confidently.`,
      evidence: { axis },
      suggestedAction: `Collect a small amount of meaningful ${axis} evidence.`,
    }));
}

export function detectProactiveSignals({ goals = [], facts = [], occurrences = [], axisDetails = {}, now = new Date() } = {}) {
  return [
    ...detectGoalStagnation(goals, facts, { now }),
    ...detectMissedHabits(occurrences),
    ...detectEvidenceGap(axisDetails),
  ];
}
