import { addFact, getAllFacts } from '../../database/factsRepository.js';
import { addRelation, getRelationsTo } from '../../database/relationRepository.js';

function planId(goalId) {
  return `goal_plan_${goalId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function createGoalPlan(goalId, {
  steps = [],
  cadence = null,
  rationale = '',
  createdBy = 'user',
  methodologyVersion = '1.0',
} = {}) {
  if (!goalId) throw new Error('goalId is required');
  if (!Array.isArray(steps) || steps.length === 0) throw new Error('At least one plan step is required');
  const id = planId(goalId);
  const factId = await addFact({
    type: 'goal.plan.created',
    objectId: goalId,
    value: steps.length,
    meta: {
      planId: id,
      steps,
      cadence,
      rationale,
      createdBy,
      methodologyVersion,
    },
  });
  for (const step of steps) {
    if (step.actionId) {
      await addRelation(step.actionId, goalId, 'supports', Number.isFinite(step.confidence) ? step.confidence : 1);
    }
  }
  return { id, goalId, factId, steps, cadence, rationale, createdBy, methodologyVersion };
}

export async function adaptGoalPlan(goalId, {
  steps = [],
  reason = '',
  evidenceIds = [],
  previousPlanId = null,
} = {}) {
  return createGoalPlan(goalId, {
    steps,
    rationale: reason,
    createdBy: 'system_adaptation',
    methodologyVersion: '1.0',
  }).then(async plan => {
    await addFact({
      type: 'goal.plan.adapted',
      objectId: goalId,
      value: steps.length,
      meta: {
        planId: plan.id,
        previousPlanId,
        reason,
        evidenceIds,
      },
    });
    return plan;
  });
}

export async function recordGoalAssessment(goalId, {
  status,
  rationale = '',
  evidenceIds = [],
} = {}) {
  if (!goalId || !status) throw new Error('goalId and status are required');
  const id = await addFact({
    type: 'goal.assessment',
    objectId: goalId,
    value: status,
    meta: { status, rationale, evidenceIds, methodologyVersion: '1.0' },
  });
  return { id, goalId, status, rationale, evidenceIds };
}

export async function recordGoalLearning(goalId, {
  learning,
  evidenceIds = [],
} = {}) {
  if (!goalId || !learning) throw new Error('goalId and learning are required');
  const id = await addFact({
    type: 'goal.learning',
    objectId: goalId,
    value: learning,
    meta: { learning, evidenceIds, methodologyVersion: '1.0' },
  });
  return { id, goalId, learning, evidenceIds };
}

export async function getLatestGoalPlan(goalId) {
  const facts = await getAllFacts();
  const plans = facts
    .filter(fact => fact.objectId === goalId && fact.type === 'goal.plan.created')
    .sort((a, b) => String(a.occurredAt || a.createdAt).localeCompare(String(b.occurredAt || b.createdAt)));
  const latest = plans.at(-1);
  if (!latest) return null;
  return {
    id: latest.meta?.planId,
    goalId,
    steps: latest.meta?.steps || [],
    cadence: latest.meta?.cadence || null,
    rationale: latest.meta?.rationale || '',
    createdBy: latest.meta?.createdBy || 'unknown',
    factId: latest.id,
    supportingRelations: await getRelationsTo(goalId),
  };
}
