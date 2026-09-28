import { getAllFacts } from '../../database/factsRepository.js';
import { getRelationsTo, getRelationsFrom } from '../../database/relationRepository.js';
import { getGoal } from '../../database/goalsRepository.js';
import { evaluateGoalOutcome } from './goalOutcomeEngine.js';
import { learnGoal } from './goalLearningEngine.js';

/**
 * Produces one read-only, explainable goal lifecycle snapshot.
 * Goal state itself remains owned by the goals repository.
 */
export async function buildGoalLifecycle(goalId, {
  expectedTrajectory = [],
  actualTrajectory = [],
  deadline = null,
} = {}) {
  const [goal, facts, incoming, outgoing, learning] = await Promise.all([
    getGoal(goalId),
    getAllFacts(),
    getRelationsTo(goalId),
    getRelationsFrom(goalId),
    learnGoal(goalId),
  ]);

  if (!goal) throw new Error('Goal not found: ' + goalId);

  const goalFacts = facts.filter(
    fact => fact.objectId === goalId && fact.type !== 'retraction'
  );

  const outcome = evaluateGoalOutcome({
    expectedTrajectory,
    actualTrajectory,
    deadline,
  });

  const actionLinks = outgoing.filter(item => item.type === 'supports');
  const evidenceLinks = incoming.filter(item => item.type === 'contributes_to');

  return {
    goalId,
    status: goal.status,
    objective: goal.title || goal.label || null,
    progress: Number(goal.progress || 0),
    targetProgress: Number(goal.targetProgress || 1),
    evidenceCount: evidenceLinks.length,
    supportingActionCount: actionLinks.length,
    factCount: goalFacts.length,
    outcome,
    learning,
    trace: {
      factIds: goalFacts.map(fact => fact.id),
      supportingActionIds: actionLinks.map(item => item.fromId),
      evidenceIds: evidenceLinks.map(item => item.fromId),
    },
  };
}
