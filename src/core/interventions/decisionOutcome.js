export function calculateDecisionOutcomeRate(recommendations = []) {
  const eligible = recommendations.filter(r => r && r.measurableOutcome !== false);
  if (!eligible.length) return { eligible: 0, accepted: 0, executed: 0, improved: 0, rate: null };
  const accepted = eligible.filter(r => ['accepted','executed','completed'].includes(r.status) || r.accepted).length;
  const executed = eligible.filter(r => ['executed','completed'].includes(r.status) || r.executed).length;
  const improved = eligible.filter(r => r.outcome?.direction === 'improved' || r.outcome?.positive === true).length;
  return {
    eligible: eligible.length,
    accepted,
    executed,
    improved,
    rate: Math.round((improved / eligible.length) * 1000) / 1000,
  };
}
