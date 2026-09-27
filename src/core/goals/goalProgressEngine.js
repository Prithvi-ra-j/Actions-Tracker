import { getGoal } from '../../database/goalsRepository.js';
import { getRelationsTo, getRelationsFrom, addRelation } from '../../database/relationRepository.js';
import { getAllFacts } from '../../database/factsRepository.js';

export function classifyEvidenceQuality(facts = []) {
  const measured = facts.filter(fact => !isSelfReported(fact)).length;
  const selfReported = facts.filter(isSelfReported).length;
  return measured > 0 ? 'measured' : selfReported > 0 ? 'self_reported' : 'none';
}

function isSelfReported(fact) {
  return ['manual', 'voice'].includes(fact?.source?.type)
    && ['reflection', 'observation', 'manual_evidence'].includes(fact?.type);
}

export async function linkEvidenceToGoal(evidenceId, goalId, confidence = 0.8) {
  if (!evidenceId || !goalId) throw new Error('Evidence and goal IDs are required.');
  await addRelation(evidenceId, goalId, 'contributes_to', confidence);
}

export async function linkActionToGoal(actionId, goalId, confidence = 1) {
  if (!actionId || !goalId) throw new Error('Action and goal IDs are required.');
  await addRelation(actionId, goalId, 'supports', confidence);
}

export async function getGoalProgress(goalId) {
  const goal = await getGoal(goalId);
  if (!goal) throw new Error('Goal not found: ' + goalId);

  const [incoming, outgoing, facts] = await Promise.all([
    getRelationsTo(goalId),
    getRelationsFrom(goalId),
    getAllFacts(),
  ]);
  const factMap = new Map(facts.map(fact => [fact.id, fact]));
  const evidenceRelations = incoming.filter(relation => relation.type === 'contributes_to');
  const evidence = evidenceRelations
    .map(relation => ({ relation, fact: factMap.get(relation.fromId) }))
    .filter(item => item.fact && item.fact.type !== 'retraction');

  const measured = evidence.filter(item => !isSelfReported(item.fact));
  const selfReported = evidence.filter(item => isSelfReported(item.fact));

  return {
    goalId,
    goal,
    status: goal.status,
    measured: {
      evidenceCount: measured.length,
      latestAt: measured.map(item => item.fact.occurredAt).sort().at(-1) || null,
    },
    selfReported: {
      evidenceCount: selfReported.length,
      latestAt: selfReported.map(item => item.fact.occurredAt).sort().at(-1) || null,
    },
    supportingActions: outgoing.filter(relation => relation.type === 'supports'),
    evidenceCount: evidence.length,
    hasEvidence: evidence.length > 0,
    evidenceQuality: measured.length > 0 ? 'measured' : selfReported.length > 0 ? 'self_reported' : 'none',
  };
}
