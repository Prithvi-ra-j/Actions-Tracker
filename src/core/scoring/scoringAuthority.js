export const SCORE_AUTHORITY_VERSION = '1.1';

export function resolveScoreAuthority({
  evidenceValue,
  canonicalValue,
  coverage = 0,
  confidence = 0,
  components = [],
  warnings = [],
  minCoverage = 0.8,
  minConfidence = 0.7,
}) {
  const normalizedCoverage = Math.max(0, Math.min(1, Number(coverage) || 0));
  const normalizedConfidence = Math.max(0, Math.min(1, Number(confidence) || 0));
  const requiredSignalsPresent = Array.isArray(components) && components.length > 0;
  const noCriticalWarnings = !warnings.some(w => String(w).startsWith('low_coverage'));

  const evidenceAuthoritative = normalizedCoverage >= minCoverage
    && normalizedConfidence >= minConfidence
    && requiredSignalsPresent
    && noCriticalWarnings
    && Number.isFinite(evidenceValue);

  return {
    version: SCORE_AUTHORITY_VERSION,
    source: evidenceAuthoritative ? 'evidence' : 'canonical',
    value: evidenceAuthoritative ? evidenceValue : canonicalValue,
    fallbackReason: evidenceAuthoritative ? null : 'Insufficient evidence coverage/confidence or required signals',
    criteria: {
      minCoverage,
      minConfidence,
      coverage: normalizedCoverage,
      confidence: normalizedConfidence,
      requiredSignalsPresent,
      noCriticalWarnings,
    },
  };
}
