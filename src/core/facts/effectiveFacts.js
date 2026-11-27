export function getEffectiveFacts(facts) {
  const removers = new Map();
  for (const fact of facts) {
    let target;
    if (['retraction', 'system.retraction'].includes(fact.type)) {
      target = fact.meta?.retractedFactId || fact.meta?.retractedId;
    }
    target = target || fact.correctionOf || fact.supersedes ||
      (fact.type === 'system.correction' ? fact.meta?.correctionOf : null);
    if (target) {
      if (!removers.has(target)) removers.set(target, []);
      removers.get(target).push(fact.id);
    }
  }
  const state = new Map();
  function isEffective(id) {
    if (state.get(id) === 'visiting') throw new Error('Fact correction history contains a cycle.');
    if (state.has(id)) return state.get(id);
    state.set(id, 'visiting');
    const effective = !(removers.get(id) || []).some(isEffective);
    state.set(id, effective);
    return effective;
  }
  return facts.filter(fact => isEffective(fact.id));
}
