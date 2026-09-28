export function buildEvidenceGraph({
  claims = [],
  evidence = [],
  facts = [],
  signals = [],
  recommendations = [],
  outcomes = [],
} = {}) {
  const nodes = [
    ...facts.map(item => ({ id: item.id, type: 'fact', data: item })),
    ...evidence.map(item => ({ id: item.id, type: 'evidence', data: item })),
    ...signals.map(item => ({ id: item.id, type: 'signal', data: item })),
    ...claims.map(item => ({ id: item.id, type: 'claim', data: item })),
    ...recommendations.map(item => ({ id: item.id, type: 'recommendation', data: item })),
    ...outcomes.map(item => ({ id: item.id, type: 'outcome', data: item })),
  ];
  const edges = [];

  for (const item of evidence) {
    for (const factId of item.supportingFactIds || []) {
      edges.push({ from: item.id, to: factId, type: 'supports' });
    }
  }

  for (const signal of signals) {
    for (const evidenceId of signal.evidenceIds || signal.evidence?.ids || []) {
      edges.push({ from: signal.id, to: evidenceId, type: 'derived_from' });
    }
  }

  for (const claim of claims) {
    for (const id of claim?.provenance?.evidenceIds || []) {
      edges.push({ from: claim.id, to: id, type: 'grounded_by' });
    }
    if (claim?.provenance?.derivedSignal) {
      edges.push({ from: claim.id, to: claim.provenance.derivedSignal, type: 'derived_from' });
    }
    if (claim?.provenance?.recommendationId) {
      edges.push({ from: claim.id, to: claim.provenance.recommendationId, type: 'informs' });
    }
    for (const outcomeId of claim?.provenance?.outcomeIds || []) {
      edges.push({ from: claim.id, to: outcomeId, type: 'validated_by' });
    }
  }

  for (const recommendation of recommendations) {
    for (const evidenceId of recommendation.evidenceIds || recommendation.evidence?.ids || []) {
      edges.push({ from: recommendation.id, to: evidenceId, type: 'based_on' });
    }
    for (const signalId of recommendation.signalIds || []) {
      edges.push({ from: recommendation.id, to: signalId, type: 'based_on' });
    }
  }

  for (const outcome of outcomes) {
    for (const evidenceId of outcome.evidenceIds || outcome.supportingEvidenceIds || []) {
      edges.push({ from: outcome.id, to: evidenceId, type: 'measured_by' });
    }
    if (outcome.recommendationId) {
      edges.push({ from: outcome.id, to: outcome.recommendationId, type: 'result_of' });
    }
  }

  return { nodes, edges };
}
