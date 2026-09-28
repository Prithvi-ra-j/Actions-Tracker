import { scoreRecommendation, applyCapacityFilter, diversifyRecommendations, explainRecommendation } from './recommendationPolicy.js';

const AXES = ['body', 'discipline', 'knowledge', 'social', 'creativity', 'strategy'];

function scoreOf(stats, axis) {
  const value = Number(stats?.[axis]);
  return Number.isFinite(value) ? value : 0;
}

export function buildTodayRecommendations({
  occurrences = [],
  stats = {},
  axisDetails = {},
  goals = [],
  capacity = {},
  recentFeedback = [],
  now = new Date(),
} = {}) {
  const candidates = [];
  const feedbackMap = new Map((recentFeedback || []).map(item => [item.recommendationId, item]));
  const pending = occurrences.filter(item => !['completed', 'excused'].includes(item.status));

  for (const occurrence of pending) {
    const id = 'occurrence:' + occurrence.id;
    const feedback = feedbackMap.get(id);
    if (feedback?.action === 'dismiss' || feedback?.action === 'not_relevant') continue;
    candidates.push({
      id,
      type: 'action',
      title: occurrence.habitTitle || 'Scheduled action',
      reason: feedback?.action === 'defer' ? 'Deferred earlier; still part of today’s plan.' : 'Already part of today’s plan.',
      priority: 100,
      urgency: 100,
      goalRelevance: Number(occurrence.goalRelevance) || 0,
      evidenceGap: 0,
      effort: Number(occurrence.effort) || 20,
      domain: occurrence.axis || occurrence.domain || null,
      actionId: occurrence.id,
      evidence: ['today schedule'],
      impact: 'Protects an existing commitment.',
    });
  }

  for (const axis of AXES) {
    const detail = axisDetails?.[axis] || {};
    const confidence = Number(detail.confidence);
    const coverage = Number(detail.coverage);
    if ((confidence < 0.45 || coverage < 0.35) && !candidates.some(item => item.domain === axis)) {
      const id = 'evidence:' + axis;
      if (!['dismiss', 'not_relevant'].includes(feedbackMap.get(id)?.action)) {
        candidates.push({
          id,
          type: 'evidence',
          title: 'Collect ' + axis + ' evidence',
          reason: 'The system knows less about this area than the others.',
          priority: 55 - scoreOf(stats, axis) * 0.1,
          urgency: 30,
          goalRelevance: 20,
          evidenceGap: 100 - Math.round(Math.max(0, confidence || 0) * 100),
          effort: 5,
          domain: axis,
          evidence: ['confidence', 'coverage'],
          impact: 'Improves calibration rather than changing the score directly.',
        });
      }
    }
  }

  for (const goal of goals.filter(item => item?.status !== 'archived')) {
    const title = goal.title || goal.label;
    if (!title) continue;
    const id = 'goal:' + goal.id;
    if (['dismiss', 'not_relevant'].includes(feedbackMap.get(id)?.action)) continue;
    candidates.push({
      id,
      type: 'goal',
      title,
      reason: goal.status === 'at_risk'
        ? 'This goal is currently at risk and needs attention.'
        : 'Keeps an active direction visible while planning today.',
      priority: goal.status === 'at_risk' ? 70 : 45,
      urgency: goal.status === 'at_risk' ? 75 : 25,
      goalRelevance: 100,
      evidenceGap: 20,
      effort: 10,
      domain: goal.domain || goal.axis || null,
      evidence: ['active goal'],
      impact: 'Protects longer-term direction.',
    });
  }

  const scored = candidates.map(item => ({
    ...item,
    score: scoreRecommendation(item),
  }));
  const capacityFiltered = applyCapacityFilter(scored, {
    capacityUsed: Number(capacity.used || capacity.usedPercent || 0),
    capacityLimit: Number(capacity.limit || capacity.weeklyBudget || 100),
    reserve: Number(capacity.reserve || 10),
  });
  const items = diversifyRecommendations(capacityFiltered, 3).map(item => ({
    ...item,
    priority: item.score,
    ...explainRecommendation(item),
  }));

  return {
    generatedAt: now.toISOString(),
    items,
    workload: {
      scheduled: occurrences.length,
      pending: pending.length,
      completed: occurrences.filter(item => item.status === 'completed').length,
    },
    policyVersion: '1.0',
  };
}
