import { detectContradictions } from './contradictionEngine.js';

/**
 * Separates what the system can assert from what it should ask about.
 * This does not decide which source is "true" when evidence conflicts.
 */
export function evaluateClaimTruth({
  claim,
  evidence = [],
  confidence = 0,
} = {}) {
  const normalizedClaim = String(claim || '').trim();
  const contradictions = detectContradictions(evidence);

  if (!normalizedClaim) {
    return { status: 'invalid', claim: normalizedClaim, confidence: 0, contradictions };
  }

  if (contradictions.length > 0) {
    return {
      status: 'conflicted',
      claim: normalizedClaim,
      confidence: Math.min(Number(confidence) || 0, 0.49),
      contradictions,
      resolution: 'ask_user',
    };
  }

  return {
    status: Number(confidence) >= 0.7 ? 'supported' : 'provisional',
    claim: normalizedClaim,
    confidence: Math.max(0, Math.min(1, Number(confidence) || 0)),
    contradictions: [],
  };
}
