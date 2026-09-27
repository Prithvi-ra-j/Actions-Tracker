export function insightFingerprint(insight = {}) {
  const key = [
    insight.type || 'insight',
    insight.title || '',
    insight.periodStart || '',
    insight.periodEnd || '',
    insight.domain || '',
  ].join('|').toLowerCase().trim();

  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 'insight_fp_' + (hash >>> 0).toString(16);
}
