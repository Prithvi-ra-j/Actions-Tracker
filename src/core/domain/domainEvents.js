/**
 * Canonical domain model for Workstream 2.
 *
 * The app historically mixed concepts like Facts, Goals, Habits, Insights,
 * and Evidence into different stores and APIs. This module introduces a single,
 * canonical contract that the rest of the system can build on.
 */

function nowIso() {
  return new Date().toISOString();
}

export function createDomainEvent({
  aggregateType,
  aggregateId,
  eventType,
  payload = {},
  actor = 'system',
  source = 'app',
  correlationId,
  causationId,
}) {
  return {
    kind: 'domain_event',
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    aggregateType,
    aggregateId,
    eventType,
    payload,
    actor,
    source,
    correlationId: correlationId ?? `${aggregateType}:${aggregateId}`,
    causationId: causationId ?? `${aggregateType}:${aggregateId}:${eventType}`,
    occurredAt: nowIso(),
  };
}

export function createIntent({
  id,
  title,
  description = '',
  status = 'active',
  owner = 'user',
  domain = 'general',
  createdAt = nowIso(),
}) {
  return {
    kind: 'intent',
    id: id ?? `intent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    description,
    status,
    owner,
    domain,
    createdAt,
  };
}

export function createAction({
  id,
  type = 'habit',
  title,
  description = '',
  status = 'planned',
  intentId = null,
  createdAt = nowIso(),
}) {
  return {
    kind: 'action',
    id: id ?? `action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    description,
    status,
    intentId,
    createdAt,
  };
}

export function createEvidence({
  id,
  domain = 'general',
  signal = 'manual',
  value = 0,
  confidence = 0,
  unit = null,
  source = 'manual',
  supportingIds = [],
  observedAt = nowIso(),
}) {
  return {
    kind: 'evidence',
    id: id ?? `evidence_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    domain,
    signal,
    value,
    confidence,
    unit,
    source,
    supportingIds,
    observedAt,
  };
}

export function createPattern({
  id,
  type,
  summary,
  severity = 'medium',
  evidenceIds = [],
  createdAt = nowIso(),
}) {
  return {
    kind: 'pattern',
    id: id ?? `pattern_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    summary,
    severity,
    evidenceIds,
    createdAt,
  };
}

export function createInsight({
  id,
  type = 'pattern',
  title,
  description = '',
  confidence = 0,
  severity = 'medium',
  evidenceIds = [],
  createdAt = nowIso(),
}) {
  return {
    kind: 'insight',
    id: id ?? `insight_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    title: title ?? 'Insight',
    description,
    confidence,
    severity,
    evidenceIds,
    createdAt,
  };
}
