export function calculateEffectiveness(interventions = [], { minSamples = 3 } = {}) {
  const completed = interventions.filter(i => i?.status === 'completed' && i?.evaluation);
  const groups = new Map();
  for (const item of completed) {
    const key = item.context?.interventionType || item.context?.recommendationType || 'unknown';
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }
  return Object.fromEntries([...groups.entries()].map(([type, items]) => {
    const positive = items.filter(i => i.evaluation.result === 'positive').length;
    const negative = items.filter(i => i.evaluation.result === 'negative').length;
    const effects = items.map(i => Number(i.evaluation.effect)).filter(Number.isFinite);
    const successRate = items.length ? positive / items.length : 0;
    const uncertainty = Math.min(1, 1 / Math.sqrt(Math.max(1, items.length)));
    return [type, {
      sampleSize: items.length,
      positive,
      negative,
      successRate: Math.round(successRate * 1000) / 1000,
      averageEffect: effects.length ? effects.reduce((a,b) => a+b, 0) / effects.length : null,
      confidence: items.length >= minSamples ? Math.round((1 - uncertainty) * 1000) / 1000 : 0,
      evidenceQuality: items.every(i => i.evaluation.confidence >= 0.5) ? 'good' : 'limited',
    }];
  }));
}
