export function buildProvenance({ claimId, claim, evidence = [], calculation = null, window = null, confidence = 0 } = {}) {
  const evidenceIds = evidence.map(item => typeof item === 'string' ? item : item?.id).filter(Boolean);
  return {
    claimId,
    claim,
    evidenceIds: [...new Set(evidenceIds)],
    calculation,
    window,
    confidence: Math.max(0, Math.min(1, Number(confidence) || 0)),
    generatedAt: new Date().toISOString(),
  };
}

export function explainProvenance(provenance, evidenceById = {}) {
  return {
    claim: provenance?.claim || '',
    evidence: (provenance?.evidenceIds || []).map(id => evidenceById[id]).filter(Boolean),
    calculation: provenance?.calculation || null,
    window: provenance?.window || null,
    confidence: provenance?.confidence ?? 0,
  };
}
