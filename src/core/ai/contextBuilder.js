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
import { getAllHabits } from '../../database/habitRepository.js';
import { getRoutineConfig } from '../../database/routineRepository.js';
import { computeGaps } from '../../helpers/gapEngine.js';
import { calculateCapacity } from '../routineEngine.js';
import { PERSONA } from '../../constants.js';
import { getAllExperiments } from '../../database/experimentRepository.js';
import { DOMAIN_PROGRESS_MODELS } from '../domainProgressModels.js';

const MEMORY_WINDOW_DAYS = 90;
const MAX_SEMANTIC_MEMORIES = 12;
const CONTEXT_BUDGETS = Object.freeze({ chat: 7000, audit: 15000 });

function estimateTokens(value) {
  return Math.ceil(JSON.stringify(value).length / 4);
}

export function compactContext(contextData, maxTokens) {
  const originalTokens = estimateTokens(contextData);
  const compacted = {
    ...contextData,
    context_budget_tokens: maxTokens,
    recent_evidence_facts: [...(contextData.recent_evidence_facts || [])],
    semantic_memories: [...(contextData.semantic_memories || [])],
    active_habits: [...(contextData.active_habits || [])],
  };

  const removable = [
    compacted.recent_evidence_facts,
    compacted.semantic_memories,
    compacted.active_habits,
  ];
  while (estimateTokens(compacted) > maxTokens && removable.some(items => items.length > 0)) {
    const largest = removable
      .filter(items => items.length > 0)
      .sort((a, b) => b.length - a.length)[0];
    largest.pop();
  }

  compacted.estimated_tokens = estimateTokens(compacted);
  compacted.compacted = compacted.estimated_tokens < originalTokens;
  return compacted;
}

export function projectEvidenceFacts(facts) {
  return facts.map(fact => ({
    id: fact.id,
    type: fact.type,
    value: fact.value,
    date: fact.localDate,
    source: fact.source?.type,
  }));
}

export function deriveEvidenceMetrics(facts) {
  const byType = new Map();
  for (const fact of facts) {
    const entry = byType.get(fact.type) || { count: 0, evidenceIds: [], values: [] };
    entry.count += 1;
    entry.evidenceIds.push(fact.id);
    if (typeof fact.value === 'number') entry.values.push(fact.value);
    byType.set(fact.type, entry);
  }

  return Object.fromEntries([...byType.entries()].map(([type, metric]) => [type, {
    count: metric.count,
    evidenceIds: metric.evidenceIds,
    numericTotal: metric.values.reduce((total, value) => total + value, 0),
    numericAverage: metric.values.length > 0
      ? metric.values.reduce((total, value) => total + value, 0) / metric.values.length
      : null,
  }]));
}

export function validateEvidenceReferences(ids, contextData) {
  const availableIds = new Set([
    ...(contextData.recent_evidence_facts || []).map(fact => fact.id),
    ...(contextData.semantic_memories || []).map(memory => memory.id),
  ]);
  const invalidIds = ids.filter(id => !availableIds.has(id));
  if (invalidIds.length > 0) {
    throw new Error(`Response references unavailable evidence: ${invalidIds.join(', ')}`);
  }
  return true;
}

export function validateClaimSupport(claims, contextData) {
  validateEvidenceReferences(claims.flatMap(claim => claim.evidenceIds), contextData);
  const evidence = [
    ...(contextData.recent_evidence_facts || []),
    ...(contextData.semantic_memories || []),
  ];

  for (const claim of claims) {
    if (claim.evidenceIds.length === 0) throw new Error('Factual claims must cite evidence');
    const claimTerms = new Set(String(claim.text).toLowerCase().match(/[a-z0-9]{3,}/g) || []);
    const claimNumbers = String(claim.text).match(/\b\d+(?:\.\d+)?\b/g) || [];
    const citedEvidence = evidence.filter(item => claim.evidenceIds.includes(item.id));
    const evidenceText = citedEvidence.map(item => JSON.stringify(item).toLowerCase()).join(' ');
    const hasTermMatch = [...claimTerms].some(term => evidenceText.includes(term));
    const hasNumberMatch = claimNumbers.length === 0 || claimNumbers.some(number => evidenceText.includes(number));
    if (!hasTermMatch || !hasNumberMatch) {
      throw new Error(`Claim is not supported by cited evidence: ${claim.text}`);
    }
  }
  return true;
}

export function selectRelevantMemories(memories, {
  now = new Date(),
  query = '',
  windowDays = MEMORY_WINDOW_DAYS,
  limit = MAX_SEMANTIC_MEMORIES,
} = {}) {
  const cutoff = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const queryTerms = new Set(String(query).toLowerCase().match(/[a-z0-9]{3,}/g) || []);

  return memories
    .filter(memory => {
      const createdAt = Date.parse(memory.createdAt ?? '');
      return Number.isFinite(createdAt) && createdAt >= cutoff;
    })
    .map(memory => {
      const contentTerms = new Set(String(memory.content).toLowerCase().match(/[a-z0-9]{3,}/g) || []);
      const directMatches = [...queryTerms].filter(term => contentTerms.has(term)).length;
      const age = Math.max(0, now.getTime() - Date.parse(memory.createdAt));
      const recency = 1 - Math.min(age / (windowDays * 24 * 60 * 60 * 1000), 1);
      return { memory, score: directMatches * 2 + recency };
    })
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.memory)
    .slice(0, limit);
}

export function normalizeDimKey(key) {
  const map = {
    body: 'body',
    mind: 'knowledge',
    craft: 'creativity',
    strategy: 'strategy',
    social: 'social',
    discipline: 'discipline'
  };
  return map[key] || key;
}

export async function assembleContext(intent = 'audit', query = '') {
  // We only pull what's necessary based on the intent.
  // For a general audit, we want the current self model, latest score snapshot, active goals, and recent facts.

  const [facts, snapshot, selfModel, goals, semanticMemories, habits, routineConfig, experiments] = await Promise.all([
    getAllFacts(),
    getLatestSnapshot(),
    getSelfModel(),
    getAllGoals(),
    getSemanticMemories(),
    getAllHabits(),
    getRoutineConfig(),
    getAllExperiments(),
  ]);

  const factWindowDays = intent === 'audit' ? 30 : 7;
  const factCutoff = new Date(Date.now() - factWindowDays * 24 * 60 * 60 * 1000).toISOString();
  const retractedFactIds = new Set(
    facts
      .filter(f => f.type === 'retraction' && f.meta?.retractedFactId)
      .map(f => f.meta.retractedFactId)
  );
  const activeFacts = facts.filter(f => !retractedFactIds.has(f.id) && f.type !== 'retraction');
  const recentFacts = activeFacts.filter(f => f.occurredAt >= factCutoff);

  const trendNowCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const trendPriorCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const trendNow = activeFacts.filter(f => f.occurredAt >= trendNowCutoff);
  const trendPrior = activeFacts.filter(f => f.occurredAt >= trendPriorCutoff && f.occurredAt < trendNowCutoff);
  const countByType = rows => rows.reduce((acc, fact) => {
    acc[fact.type] = (acc[fact.type] || 0) + 1;
    return acc;
  }, {});
  const trendNowCounts = countByType(trendNow);
  const trendPriorCounts = countByType(trendPrior);
  const trendMetrics = [...new Set([...Object.keys(trendNowCounts), ...Object.keys(trendPriorCounts)])]
    .map(type => ({
      type,
      current7d: trendNowCounts[type] || 0,
      prior7d: trendPriorCounts[type] || 0,
      delta: (trendNowCounts[type] || 0) - (trendPriorCounts[type] || 0),
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 12);

  const activeGoals = goals.filter(g => g.status === 'active');

  const activeHabits = habits.filter(h => h.status === 'active');
  const routineCapacity = calculateCapacity(routineConfig, activeHabits);
  const selectedMemories = selectRelevantMemories(semanticMemories, { query });

  const normalizedDims = {};
  if (selfModel?.desiredSelf?.dimensions) {
    for (const [k, v] of Object.entries(selfModel.desiredSelf.dimensions)) {
      normalizedDims[normalizeDimKey(k)] = v;
    }
  }

  const contextData = {
    context_version: '1.0',
    request: { intent },
    domain_progress_models: Object.fromEntries(
      (selfModel?.focusAxes || []).map(axis => [axis, DOMAIN_PROGRESS_MODELS[axis]])
    ),
    system_date: new Date().toISOString(),
    user_identity: selfModel?.identity || {},
    semantic_memories: selectedMemories.map(m => ({
      id: m.id,
      content: m.content,
      confidence: m.confidence,
      createdAt: m.createdAt,
    })),
    latest_scores: snapshot?.stats || {},
    active_goals: activeGoals.map(g => ({
      title: g.title,
      targets: g.targets?.map(t => ({ name: t.name, completed: t.completed }))
    })),
    recent_evidence_facts: projectEvidenceFacts(recentFacts),
    derived_metrics: deriveEvidenceMetrics(recentFacts),
    trend_metrics_7d_vs_prior_7d: trendMetrics,
    active_experiments: (experiments || []).filter(experiment => !experiment.conclusion).slice(-8).map(experiment => ({
      id: experiment.id,
      domain: experiment.domain,
      hypothesis: experiment.hypothesis,
      protocol: experiment.protocol,
      result: experiment.result,
      conclusion: experiment.conclusion,
      createdAt: experiment.createdAt,
    })),
    active_habits: activeHabits.map(h => ({
      id: h.id, name: h.name, domain: h.domain, phase: h.phase,
      masteryLevel: h.masteryRoadmap?.currentLevel,
      implementationIntention: h.implementationIntention,
      identityVote: h.identityVote,
    })),
    routine: {
      budget: routineConfig?.weeklyBudget,
      usedHours: routineCapacity.usedHours,
      freeHours: routineCapacity.freeHours,
      overcommitted: routineCapacity.overcommitted,
      conflicts: routineCapacity.conflicts,
      timeSlots: routineConfig?.timeSlots || [],
    },
    gaps: selfModel ? computeGaps(snapshot?.stats || {}, normalizedDims) : {},
    scoring_details: snapshot?.axisDetails || {},
    missing_data: [
      !snapshot && 'No score snapshot is available.',
      !selfModel && 'No self model is available.',
      recentFacts.length === 0 && `No facts were recorded in the last ${factWindowDays} days.`,
    ].filter(Boolean),
    vision: selfModel?.desiredSelf?.vision || '',
    setup_state: selfModel?.setupState || 'established',
    onboarding_targets: selfModel?.desiredSelf?.dimensions || {},
    persona_statements: PERSONA,
  };

  return JSON.stringify(compactContext(contextData, CONTEXT_BUDGETS[intent] || CONTEXT_BUDGETS.chat), null, 2);
}
