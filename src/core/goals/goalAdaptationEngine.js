import { adaptGoalPlan, getLatestGoalPlan, recordGoalAssessment, recordGoalLearning } from './goalPlanEngine.js';
import { evaluateGoalOutcome } from './goalOutcomeEngine.js';

export async function adaptGoalIfNeeded(goalId, {
  expectedTrajectory = [],
  actualTrajectory = [],
  deadline = null,
  evidenceIds = [],
  replacementSteps = [],
  reason = '',
} = {}) {
  const outcome = evaluateGoalOutcome({ expectedTrajectory, actualTrajectory, deadline });
  await recordGoalAssessment(goalId, {
    status: outcome.status,
    rationale: reason || `Goal trajectory evaluated as ${outcome.status}.`,
    evidenceIds,
  });

  if (!replacementSteps.length || outcome.status === 'on_track') {
    return { adapted: false, outcome, plan: await getLatestGoalPlan(goalId) };
  }

  const previousPlan = await getLatestGoalPlan(goalId);
  const plan = await adaptGoalPlan(goalId, {
    steps: replacementSteps,
    reason: reason || `Adapted because trajectory is ${outcome.status}.`,
    evidenceIds,
    previousPlanId: previousPlan?.id || null,
  });
  await recordGoalLearning(goalId, {
    learning: `Plan adaptation triggered by ${outcome.status} trajectory.`,
    evidenceIds,
  });
  return { adapted: true, outcome, plan };
}
