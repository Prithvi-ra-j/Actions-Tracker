export const GOAL_HEALTH = Object.freeze([
  'ON TRACK',
  'AT RISK',
  'STALLED',
  'INSUFFICIENT EVIDENCE',
  'COMPLETED',
]);

export function classifyGoalHealth({
  status = 'active',
  progress = 0,
  targetProgress = 1,
  recentEvidenceCount = 0,
  recentActionCount = 0,
  daysSinceEvidence = null,
  stalledDays = 14,
} = {}) {
  if (['completed', 'complete'].includes(status)) return 'COMPLETED';
  if (recentEvidenceCount <= 0 && recentActionCount <= 0) return 'INSUFFICIENT EVIDENCE';

  const ratio = Number.isFinite(targetProgress) && targetProgress > 0
    ? Number(progress || 0) / targetProgress
    : 0;

  if (daysSinceEvidence != null && daysSinceEvidence > stalledDays && recentActionCount === 0) {
    return 'STALLED';
  }
  if (ratio < 0.35 && recentActionCount > 0) return 'AT RISK';
  if (ratio >= 1) return 'COMPLETED';
  return 'ON TRACK';
}

export function goalHealthExplanation(health) {
  switch (health) {
    case 'ON TRACK': return 'Recent activity and evidence indicate forward progress.';
    case 'AT RISK': return 'Activity exists, but progress is below the expected pace.';
    case 'STALLED': return 'The goal has had no recent meaningful action.';
    case 'COMPLETED': return 'The measured outcome has reached the target.';
    default: return 'There is not enough evidence to judge progress.';
  }
}
