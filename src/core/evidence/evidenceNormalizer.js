import { canonicalDomain } from '../domain/domainRegistry.js';

export const EVIDENCE_SOURCES = Object.freeze(['user', 'integration', 'jarvis', 'system']);

export function normalizeEvidence(input = {}) {
  const sourceType = input.source?.type || input.source || 'system';
  const normalizedSource = EVIDENCE_SOURCES.includes(sourceType) ? sourceType : 'system';
  const occurredAt = input.occurredAt || input.observedAt || input.timeWindow?.end || new Date().toISOString();

  return {
    ...input,
    domain: canonicalDomain(input.domain),
    source: {
      type: normalizedSource,
      integrationId: input.source?.integrationId || input.integrationId || null,
      actorId: input.source?.actorId || null,
    },
    occurredAt,
    observedAt: input.observedAt || occurredAt,
    status: input.status || 'active',
    freshness: Number.isFinite(input.freshness) ? Math.max(0, Math.min(1, input.freshness)) : 1,
    supportingFactIds: Array.isArray(input.supportingFactIds) ? [...new Set(input.supportingFactIds)] : [],
  };
}

export function isRetractedEvidence(evidence) {
  return evidence?.status === 'retracted'
    || evidence?.meta?.correctionType === 'retraction'
    || evidence?.type === 'retraction';
}
