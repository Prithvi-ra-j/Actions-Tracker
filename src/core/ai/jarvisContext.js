/**
 * Canonical context contract for every contextual Jarvis entry point.
 *
 * Keeping this shape centralized prevents pages from inventing their own
 * context payloads and gives Jarvis a stable, inspectable entry contract.
 */
const PAGES = new Set(['today', 'stats', 'goals', 'learn', 'audits', 'settings', 'jarvis']);
const ENTITY_TYPES = new Set(['none', 'routine', 'habit', 'axis', 'goal', 'learning', 'audit', 'finding']);

export function createJarvisEntryContext({
  page,
  entityType = 'none',
  entityId = null,
  payload = null,
} = {}) {
  const normalizedPage = PAGES.has(page) ? page : 'jarvis';
  const normalizedEntityType = ENTITY_TYPES.has(entityType) ? entityType : 'none';

  return Object.freeze({
    page: normalizedPage,
    entityType: normalizedEntityType,
    entityId: entityId ?? null,
    payload: payload ?? null,
  });
}

export function normalizeJarvisEntryContext(context) {
  if (!context) return null;
  if (typeof context === 'string') {
    return createJarvisEntryContext({ page: context });
  }
  return createJarvisEntryContext(context);
}

export function formatJarvisContext(context) {
  if (!context) return '';
  const entity = context.entityType !== 'none'
    ? `\nEntity: ${context.entityType}${context.entityId ? ` (${context.entityId})` : ''}`
    : '';
  const payload = context.payload
    ? `\nAttached context: ${JSON.stringify(context.payload)}`
    : '';

  return [
    'ENTRY CONTEXT (use this to ground the response; do not treat it as a user claim):',
    `Page: ${context.page}${entity}${payload}`,
  ].join('\n');
}
