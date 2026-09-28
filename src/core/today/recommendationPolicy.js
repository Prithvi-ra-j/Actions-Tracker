const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));

export function scoreRecommendation({
  priority = 0,
  urgency = 0,
  goalRelevance = 0,
  evidenceGap = 0,
  effort = 0,
  repetitionPenalty = 0,
} = {}) {
  return clamp(
    priority * 0.35 +
    urgency * 0.2 +
    goalRelevance * 0.2 +
    evidenceGap * 0.15 -
    effort * 0.05 -
    repetitionPenalty * 0.05
  );
}

export function applyCapacityFilter(items = [], {
  capacityUsed = 0,
  capacityLimit = 100,
  reserve = 10,
} = {}) {
  const available = Math.max(0, capacityLimit - capacityUsed - reserve);
  return items.filter(item => Number(item.effort ?? 0) <= available || item.type === 'evidence');
}

export function diversifyRecommendations(items = [], maxItems = 3) {
  const out = [];
  const domains = new Set();
  for (const item of [...items].sort((a, b) => b.score - a.score)) {
    const sameDomain = item.domain && domains.has(item.domain);
    if (sameDomain && out.length < Math.min(2, maxItems)) continue;
    out.push(item);
    if (item.domain) domains.add(item.domain);
    if (out.length >= maxItems) break;
  }
  return out;
}

export function explainRecommendation(item = {}) {
  return {
    reason: item.reason || 'This is relevant to your current plan.',
    evidence: item.evidence || [],
    impact: item.impact || 'Keeps progress moving.',
    effort: item.effort || 'Unknown',
  };
}
