export function classifyRetry(error, attempt = 0, maxAttempts = 3) {
  const message = String(error?.message || error || '').toLowerCase();
  const retryable = /timeout|temporar|network|fetch|rate limit|unavailable|throttl/.test(message)
    || [408, 425, 429, 500, 502, 503, 504].includes(Number(error?.status || error?.statusCode));
  if (!retryable || attempt >= maxAttempts - 1) {
    return { retry: false, attempt, maxAttempts, reason: retryable ? 'attempt_limit' : 'non_retryable' };
  }
  const delayMs = Math.min(30000, 500 * (2 ** attempt));
  return { retry: true, attempt: attempt + 1, maxAttempts, delayMs, reason: 'transient' };
}

export async function withRetry(operation, {
  maxAttempts = 3,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  onRetry = () => {},
} = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await operation(attempt);
    } catch (error) {
      const decision = classifyRetry(error, attempt, maxAttempts);
      if (!decision.retry) throw error;
      await onRetry(decision, error);
      await sleep(decision.delayMs);
      attempt = decision.attempt;
    }
  }
}
