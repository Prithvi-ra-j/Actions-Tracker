const ERROR_CATEGORIES = Object.freeze([
  'BOOT','DATABASE','MIGRATION','BACKUP','RESTORE','AI','ACTION','CONNECTOR','SCHEDULER','PERMISSION','VALIDATION'
]);

function redact(value, depth = 0) {
  if (depth > 3) return '[truncated]';
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value
      .replace(/(Bearer\s+)[^\s]+/gi, '$1[redacted]')
      .replace(/(api[-_]?key|password|token|secret)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
      .slice(0, 1000);
  }
  if (Array.isArray(value)) return value.slice(0, 20).map(item => redact(item, depth + 1));
  return Object.fromEntries(Object.entries(value).slice(0, 40).map(([key, item]) => [
    key,
    /api[-_]?key|authorization|password|token|secret|cookie|session|credential/i.test(key)
      ? '[redacted]'
      : redact(item, depth + 1),
  ]));
}

export function createCorrelationId(prefix = 'op') {
  const suffix = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}_${suffix}`;
}

export function classifyErrorCategory(category) {
  const normalized = String(category || 'VALIDATION').toUpperCase();
  return ERROR_CATEGORIES.includes(normalized) ? normalized : 'VALIDATION';
}

export function createStructuredError({
  error,
  category = 'VALIDATION',
  operation = 'unknown',
  severity = 'error',
  correlationId = createCorrelationId(),
  causationId = null,
  recoveryState = 'none',
  metadata = {},
} = {}) {
  const source = error instanceof Error ? error : new Error(String(error?.message || error || 'Unknown error'));
  return {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : createCorrelationId('err'),
    timestamp: new Date().toISOString(),
    severity,
    category: classifyErrorCategory(category),
    correlationId,
    causationId,
    operation,
    result: 'failed',
    recoveryState,
    name: source.name || 'Error',
    message: redact(source.message || String(source)),
    stack: redact(source.stack || ''),
    metadata: redact(metadata),
  };
}

export function isRetryableError(errorLike) {
  const message = String(errorLike?.message || errorLike || '').toLowerCase();
  const status = Number(errorLike?.status || errorLike?.statusCode);
  if ([408, 425, 429].includes(status) || status >= 500) return true;
  return /timeout|temporar|network|fetch|rate limit|unavailable|throttl/.test(message);
}
