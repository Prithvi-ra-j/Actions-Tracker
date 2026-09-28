export function buildProvenance({
  claimId,
  claim,
  evidence = [],
  calculation = null,
  window = null,
  confidence = 0,
  source = null,
  derivedSignal = null,
  recommendationId = null,
  outcomeIds = [],
} = {}) {
  const evidenceIds = evidence.map(item => typeof item === 'string' ? item : item?.id).filter(Boolean);
  return {
    claimId,
    claim,
    source,
    evidenceIds: [...new Set(evidenceIds)],
    derivedSignal,
    recommendationId,
    outcomeIds: [...new Set(outcomeIds.filter(Boolean))],
    calculation,
    window,
    confidence: Math.max(0, Math.min(1, Number(confidence) || 0)),
    generatedAt: new Date().toISOString(),
  };
}

export function explainProvenance(provenance, evidenceById = {}, {
  signalsById = {},
  recommendationsById = {},
  outcomesById = {},
} = {}) {
  return {
    claim: provenance?.claim || '',
    source: provenance?.source || null,
    evidence: (provenance?.evidenceIds || []).map(id => evidenceById[id]).filter(Boolean),
    derivedSignal: provenance?.derivedSignal
      ? signalsById[provenance.derivedSignal] || { id: provenance.derivedSignal }
      : null,
    recommendation: provenance?.recommendationId
      ? recommendationsById[provenance.recommendationId] || { id: provenance.recommendationId }
      : null,
    outcomes: (provenance?.outcomeIds || []).map(id => outcomesById[id] || { id }).filter(Boolean),
    calculation: provenance?.calculation || null,
    window: provenance?.window || null,
    confidence: provenance?.confidence ?? 0,
  };
}
