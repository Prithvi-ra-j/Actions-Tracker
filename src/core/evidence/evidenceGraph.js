export function buildEvidenceGraph({ claims = [], evidence = [], facts = [] } = {}) {
  const nodes = [
    ...facts.map(item => ({ id: item.id, type: 'fact', data: item })),
    ...evidence.map(item => ({ id: item.id, type: 'evidence', data: item })),
    ...claims.map(item => ({ id: item.id, type: 'claim', data: item })),
  ];
  const edges = [];
  for (const item of evidence) {
    for (const factId of item.supportingFactIds || []) edges.push({ from: item.id, to: factId, type: 'supports' });
  }
  for (const claim of claims) {
    for (const id of claim?.provenance?.evidenceIds || []) edges.push({ from: claim.id, to: id, type: 'grounded_by' });
  }
  return { nodes, edges };
}
