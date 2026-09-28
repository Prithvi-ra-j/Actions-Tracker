const normalize = value => String(value ?? '').trim().toLowerCase();

export function detectContradictions(items = []) {
  const groups = new Map();
  for (const item of items) {
    const key = item?.subjectId || item?.objectId || item?.metric;
    if (!key) continue;
    const polarity = item?.polarity || (Number(item?.value) >= 0 ? 'positive' : 'negative');
    const list = groups.get(key) || [];
    list.push({ ...item, polarity });
    groups.set(key, list);
  }

  return [...groups.entries()].flatMap(([subjectId, values]) => {
    const positive = values.filter(v => normalize(v.polarity) === 'positive');
    const negative = values.filter(v => normalize(v.polarity) === 'negative');
    if (!positive.length || !negative.length) return [];
    return [{
      id: `contradiction:${subjectId}`,
      type: 'contradiction',
      subjectId,
      severity: 'high',
      confidence: Math.min(1, 0.5 + Math.min(positive.length, negative.length) * 0.15),
      evidenceIds: [...positive, ...negative].map(v => v.id).filter(Boolean),
      positive,
      negative,
      resolution: 'ask_user',
    }];
  });
}

export function reconcileSources(items = []) {
  const contradictions = detectContradictions(items);
  return {
    status: contradictions.length ? 'conflicted' : 'consistent',
    contradictions,
    authoritative: contradictions.length ? null : items.at(-1) || null,
  };
}
