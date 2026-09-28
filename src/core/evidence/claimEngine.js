import { buildProvenance } from './provenanceEngine.js';

export function createGroundedClaim({
  text,
  evidence = [],
  calculation = null,
  window = null,
  confidence = 0,
  claimId = null,
  source = null,
  derivedSignal = null,
  recommendationId = null,
  outcomeIds = [],
} = {}) {
  if (!text) throw new Error('Claim text is required');
  if (!evidence.length) throw new Error('Grounded claims require evidence');
  return {
    id: claimId || `claim_${Date.now()}`,
    text,
    provenance: buildProvenance({
      claimId,
      claim: text,
      evidence,
      calculation,
      window,
      confidence,
      source,
      derivedSignal,
      recommendationId,
      outcomeIds,
    }),
  };
}

export function claimCanBeShown(claim, { minConfidence = 0.45 } = {}) {
  return Boolean(
    claim?.provenance?.evidenceIds?.length &&
    Number(claim?.provenance?.confidence) >= minConfidence
  );
}
