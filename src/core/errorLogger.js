import { dbPut, dbGetAll, getDB } from '../database/db.js';

const MAX_TEXT = 2000;
const recentErrors = new Map();
const pendingErrors = [];
let dbReady = false;

const SENSITIVE_KEYS = /api[-_]?key|authorization|password|passwd|token|secret|cookie|session|credential/i;

function redact(value, depth = 0) {
  if (depth > 3) return '[truncated]';
  if (value == null) return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: redactString(value.stack || ''),
    };
  }

  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) return value.slice(0, 20).map(v => redact(v, depth + 1));

  if (typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value).slice(0, 40)) {
      out[key] = SENSITIVE_KEYS.test(key) ? '[redacted]' : redact(val, depth + 1);
    }
    return out;
  }

  return String(value);
}

function redactString(value) {
  return String(value ?? '')
    .replace(/(Bearer\s+)[^\s]+/gi, '$1[redacted]')
    .replace(/([?&](?:api[_-]?key|token|access_token|key)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/(api[_-]?key|password|token|secret)\s*[:=]\s*["']?[^\s,"'}]+/gi, '$1=[redacted]')
    .slice(0, MAX_TEXT);
}

function normalizeError(input) {
  if (input instanceof Error) return input;
  if (input?.error instanceof Error) return input.error;
  if (input?.reason instanceof Error) return input.reason;
  return new Error(redactString(
    typeof input === 'string' ? input : input?.message || JSON.stringify(redact(input))
  ));
}

/**
 * Persist an application error to the local telemetry store.
 *
 * This is deliberately best-effort: logging an error must never create
 * another user-visible error or change the application's control flow.
 */
export async function recordAppError(error, context = {}) {
  try {
    const normalized = normalizeError(error);
    const source = context.source || 'unknown';
    const operation = context.operation || 'unknown';
    const fingerprint = [
      normalized.name,
      normalized.message,
      source,
      operation,
    ].join('|');

    // React error boundaries and console interception can report the same
    // failure twice. Collapse identical reports occurring within 2 seconds.
    const now = Date.now();
    const previous = recentErrors.get(fingerprint);
    if (previous && now - previous < 2000) return;
    recentErrors.set(fingerprint, now);

    for (const [key, timestamp] of recentErrors) {
      if (now - timestamp > 10000) recentErrors.delete(key);
    }

    const record = {
      id: crypto.randomUUID(),
      type: 'error',
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      severity: context.severity || 'error',
      source,
      operation,
      message: redactString(normalized.message || String(normalized)),
      name: normalized.name || 'Error',
      stack: redactString(normalized.stack || ''),
      component: context.component || null,
      metadata: redact(context.metadata || {}),
      url: typeof window !== 'undefined' ? redactString(window.location?.href || '') : null,
      userAgent: typeof navigator !== 'undefined' ? redactString(navigator.userAgent || '') : null,
    };

    if (!dbReady) {
      pendingErrors.push(record);
      if (pendingErrors.length > 100) pendingErrors.shift();
      return;
    }
    await dbPut('telemetry', record);
  } catch {
    // Never throw from the error logger.
  }
}

export async function markErrorLoggerReady() {
  dbReady = true;
  const queued = pendingErrors.splice(0);
  for (const record of queued) { try { await dbPut('telemetry', record); } catch { /* best effort */ } }
}

export async function getErrorLogs(limit = 100) {
  try {
    const all = await dbGetAll('telemetry');
    return all.filter(item => item.type === 'error').sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))).slice(0, limit);
  } catch { return []; }
}

export async function clearErrorLogs() {
  try {
    await new Promise((resolve, reject) => {
      const tx = getDB().transaction('telemetry', 'readwrite');
      const request = tx.objectStore('telemetry').openCursor();
      request.onsuccess = event => {
        const cursor = event.target.result;
        if (!cursor) return;
        if (cursor.value?.type === 'error') cursor.delete();
        cursor.continue();
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch { /* best effort */ }
}

export function installGlobalErrorLogging() {
  if (typeof window === 'undefined') return () => {};
  if (window.__actionsErrorLoggingInstalled) return window.__actionsErrorLoggingCleanup || (() => {});

  const originalConsoleError = console.error.bind(console);
  const originalFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;

  const onWindowError = event => {
    recordAppError(event.error || event.message, {
      source: 'window',
      operation: 'uncaught_exception',
      metadata: {
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
      },
    });
  };

  const onUnhandledRejection = event => {
    recordAppError(event.reason, {
      source: 'window',
      operation: 'unhandled_rejection',
    });
  };

  const onSecurityPolicyViolation = event => {
    recordAppError(new Error(`CSP violation: ${event.violatedDirective || 'unknown directive'}`), {
      source: 'browser',
      operation: 'security_policy_violation',
      metadata: {
        blockedURI: event.blockedURI,
        sourceFile: event.sourceFile,
        lineNumber: event.lineNumber,
      },
    });
  };

  window.addEventListener('error', onWindowError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);
  window.addEventListener('securitypolicyviolation', onSecurityPolicyViolation);

  // Existing code already reports many failures through console.error().
  // Intercept it once so those caught errors are persisted without requiring
  // every repository/component to be rewritten.
  console.error = (...args) => {
    originalConsoleError(...args);
    const firstError = args.find(arg => arg instanceof Error);
    recordAppError(firstError || args.map(redact).join(' '), {
      source: 'console',
      operation: 'console.error',
    });
  };

  // Capture network failures that would otherwise only surface as rejected
  // fetch promises. HTTP responses are intentionally not logged here because
  // 4xx responses can be expected application behaviour.
  if (originalFetch) {
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (response.status >= 500) {
          const request = args[0];
          const requestUrl = typeof request === 'string' ? request : request?.url;
          recordAppError(new Error('HTTP ' + response.status + ' ' + response.statusText), {
            source: 'network',
            operation: 'http_response_error',
            metadata: { url: requestUrl, status: response.status, statusText: response.statusText },
          });
        }
        return response;
      } catch (error) {
        const request = args[0];
        const requestUrl = typeof request === 'string' ? request : request?.url;
        recordAppError(error, {
          source: 'network',
          operation: 'fetch',
          metadata: { url: requestUrl },
        });
        throw error;
      }
    };
  }

  const cleanup = () => {
    window.removeEventListener('error', onWindowError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
    window.removeEventListener('securitypolicyviolation', onSecurityPolicyViolation);
    console.error = originalConsoleError;
    if (originalFetch) window.fetch = originalFetch;
    delete window.__actionsErrorLoggingInstalled;
    delete window.__actionsErrorLoggingCleanup;
  };

  window.__actionsErrorLoggingInstalled = true;
  window.__actionsErrorLoggingCleanup = cleanup;
  return cleanup;
}
