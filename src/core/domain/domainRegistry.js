/** Canonical domain/entity registry for Actions-Tracker 2.0. */
export const CANONICAL_DOMAINS = Object.freeze([
  'body', 'discipline', 'knowledge', 'social', 'creativity', 'strategy', 'general',
]);

/**
 * Authoritative model contract:
 * entity -> owner store -> constructor -> validator -> events -> relations.
 * Names are intentionally strings so the registry stays dependency-free and can
 * be consumed by migrations, audits, exports, tests and UI tooling.
 */
export const ENTITY_REGISTRY = Object.freeze({
  intent: {
    owner: 'user',
    store: 'appMeta',
    constructor: 'createIntent',
    validator: 'validateDomainEntity',
    events: ['intent.created', 'intent.updated', 'intent.archived'],
    relations: ['goal.intentId', 'action.intentId'],
    mutable: true,
    history: 'versioned',
  },
  goal: {
    owner: 'user',
    store: 'goals',
    constructor: 'createGoal',
    validator: 'validateDomainEntity',
    events: ['goal.created', 'goal.updated', 'goal.completed', 'goal.archived'],
    relations: ['action.goalId', 'evidence.goalId', 'learning.goalId'],
    mutable: true,
    history: 'versioned',
  },
  action: {
    owner: 'user',
    store: 'habits',
    constructor: 'createAction',
    validator: 'validateDomainEntity',
    events: ['action.created', 'action.completed', 'action.deferred', 'action.archived'],
    relations: ['intent.id', 'goal.id', 'evidence.actionId'],
    mutable: true,
    history: 'versioned',
  },
  evidence: {
    owner: 'system',
    store: 'evidence',
    constructor: 'createEvidence',
    validator: 'validateDomainEntity',
    events: ['evidence.observed', 'evidence.corrected', 'evidence.retracted'],
    relations: ['fact.supports', 'claim.groundedBy', 'recommendation.basedOn'],
    mutable: false,
    history: 'append_only',
  },
  fact: {
    owner: 'system',
    store: 'facts',
    constructor: 'addFact',
    validator: 'factSchema',
    events: ['fact.recorded', 'fact.corrected', 'fact.retracted'],
    relations: ['evidence.supportedBy'],
    mutable: false,
    history: 'append_only',
  },
  pattern: {
    owner: 'system',
    store: 'insights',
    constructor: 'createPattern',
    validator: 'validateDomainEntity',
    events: ['pattern.derived', 'pattern.superseded'],
    relations: ['evidence.derivedFrom'],
    mutable: false,
    history: 'derived',
  },
  insight: {
    owner: 'system',
    store: 'insights',
    constructor: 'createInsight',
    validator: 'validateDomainEntity',
    events: ['insight.derived', 'insight.dismissed', 'insight.expired'],
    relations: ['pattern.derivedFrom', 'evidence.basedOn'],
    mutable: true,
    history: 'derived',
  },
  intervention: {
    owner: 'system',
    store: 'interventions',
    constructor: 'createIntervention',
    validator: 'interventionContract',
    events: ['intervention.started', 'intervention.outcome_due', 'intervention.completed'],
    relations: ['recommendation.id', 'evidence.measures', 'outcome.validates'],
    mutable: true,
    history: 'versioned',
  },
  recommendation: {
    owner: 'system',
    store: 'derived',
    constructor: 'buildTodayRecommendations',
    validator: 'recommendationContract',
    events: ['recommendation.generated', 'recommendation.accepted', 'recommendation.rejected', 'recommendation.expired'],
    relations: ['signal.basedOn', 'intervention.id', 'outcome.id'],
    mutable: false,
    history: 'derived',
  },
  claim: {
    owner: 'system',
    store: 'derived',
    constructor: 'createGroundedClaim',
    validator: 'claimContract',
    events: ['claim.generated', 'claim.conflicted', 'claim.validated'],
    relations: ['evidence.id', 'recommendation.id', 'outcome.id'],
    mutable: false,
    history: 'derived',
  },
});

export const LEGACY_DOMAIN_MAP = Object.freeze({
  strength: 'body',
  wisdom: 'strategy',
  art: 'creativity',
  philosophy: 'knowledge',
  history: 'strategy',
});

export const LEGACY_ENTITY_MAP = Object.freeze({
  lifeObjects: 'goal',
  habits: 'action',
  questBoard: 'action',
  logs: 'evidence',
  facts: 'fact',
  evidence: 'evidence',
  insights: 'insight',
  audits: 'insight',
});

export function canonicalDomain(value, fallback = 'general') {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  return LEGACY_DOMAIN_MAP[normalized]
    ?? (CANONICAL_DOMAINS.includes(normalized) ? normalized : fallback);
}

export function canonicalEntityForStore(storeName) {
  return LEGACY_ENTITY_MAP[storeName] ?? null;
}

export function getDomainRegistry() {
  return {
    domains: [...CANONICAL_DOMAINS],
    entities: JSON.parse(JSON.stringify(ENTITY_REGISTRY)),
    legacyDomains: { ...LEGACY_DOMAIN_MAP },
    legacyEntities: { ...LEGACY_ENTITY_MAP },
  };
}
