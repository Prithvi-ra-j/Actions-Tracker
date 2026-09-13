/**
 * AI Context Retrieval (§27).
 *
 * Gathers relevant subset of data to feed the model. Never sends the whole DB.
 */

import { getAllFacts } from '../../database/factsRepository.js';
import { getLatestSnapshot } from '../../database/statSnapshotsRepository.js';
import { getSelfModel } from '../../database/selfModelRepository.js';
import { getAllGoals } from '../../database/goalsRepository.js';
import { getSemanticMemories } from '../../database/memoryRepository.js';

export async function assembleContext(intent = 'audit') {
  // We only pull what's necessary based on the intent.
  // For a general audit, we want the current self model, latest score snapshot, active goals, and recent facts.

  const [facts, snapshot, selfModel, goals, semanticMemories] = await Promise.all([
    getAllFacts(),
    getLatestSnapshot(),
    getSelfModel(),
    getAllGoals(),
    getSemanticMemories()
  ]);

  // Filter to facts from the last 7 days to keep context dense and relevant
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentFacts = facts.filter(f => f.occurredAt >= sevenDaysAgo);

  const activeGoals = goals.filter(g => g.status === 'active');

  const contextData = {
    system_date: new Date().toISOString(),
    user_identity: selfModel?.identity || {},
    semantic_memories: semanticMemories.map(m => m.content),
    latest_scores: snapshot?.stats || {},
    active_goals: activeGoals.map(g => ({
      title: g.title,
      targets: g.targets?.map(t => ({ name: t.name, completed: t.completed }))
    })),
    recent_evidence_facts: recentFacts.map(f => ({
      id: f.id,
      type: f.type,
      value: f.value,
      date: f.localDate,
      source: f.source?.type
    }))
  };

  return JSON.stringify(contextData, null, 2);
}
