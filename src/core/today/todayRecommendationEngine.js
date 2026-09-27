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
  now = new Date(),
} = {}) {
  const recommendations = [];
  const pending = occurrences.filter(item => !['completed', 'excused'].includes(item.status));

  for (const occurrence of pending.slice(0, 3)) {
    recommendations.push({
      id: 'occurrence:' + occurrence.id,
      type: 'action',
      title: occurrence.habitTitle || 'Scheduled action',
      reason: 'Already part of today’s plan.',
      priority: 100,
      actionId: occurrence.id,
      domain: occurrence.axis || occurrence.domain || null,
    });
  }

  for (const axis of AXES) {
    const detail = axisDetails?.[axis] || {};
    const confidence = Number(detail.confidence);
    const coverage = Number(detail.coverage);
    if ((confidence < 0.45 || coverage < 0.35) && !recommendations.some(item => item.domain === axis)) {
      recommendations.push({
        id: 'evidence:' + axis,
        type: 'evidence',
        title: 'Collect ' + axis + ' evidence',
        reason: 'The system knows less about this area than the others.',
        priority: 55 - scoreOf(stats, axis) * 0.1,
        domain: axis,
      });
    }
  }

  for (const goal of goals.filter(item => item?.status !== 'archived').slice(0, 2)) {
    const title = goal.title || goal.label;
    if (!title) continue;
    recommendations.push({
      id: 'goal:' + goal.id,
      type: 'goal',
      title,
      reason: 'Keep an active direction visible while planning today.',
      priority: 45,
      domain: goal.domain || goal.axis || null,
    });
  }

  const unique = [];
  const seen = new Set();
  for (const item of recommendations.sort((a, b) => b.priority - a.priority)) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
    if (unique.length === 3) break;
  }

  return {
    generatedAt: now.toISOString(),
    items: unique,
    workload: {
      scheduled: occurrences.length,
      pending: pending.length,
      completed: occurrences.filter(item => item.status === 'completed').length,
    },
  };
}
