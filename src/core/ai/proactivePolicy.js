const DEFAULT_BUDGET = 2;

export function isWithinQuietHours(date = new Date(), quietHours = { start: 22, end: 7 }) {
  const hour = date.getHours();
  if (quietHours.start === quietHours.end) return false;
  if (quietHours.start < quietHours.end) return hour >= quietHours.start && hour < quietHours.end;
  return hour >= quietHours.start || hour < quietHours.end;
}

export function createInsightFingerprint(input = {}) {
  return [
    input.type || 'insight',
    input.domain || 'general',
    input.period || '',
    input.title || input.summary || '',
  ].join('|').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function shouldSurfaceInsight({
  severity = 'LOW',
  confidence = 0,
  fingerprint,
  recentFingerprints = [],
  emittedToday = 0,
  budget = DEFAULT_BUDGET,
  quietHours = { start: 22, end: 7 },
  now = new Date(),
  force = false,
} = {}) {
  if (!force && isWithinQuietHours(now, quietHours)) return { allowed: false, reason: 'quiet_hours' };
  if (!force && emittedToday >= budget) return { allowed: false, reason: 'notification_budget' };
  if (!force && fingerprint && recentFingerprints.includes(fingerprint)) return { allowed: false, reason: 'duplicate' };

  const normalizedConfidence = Math.max(0, Math.min(1, Number(confidence) || 0));
  const threshold = severity === 'HIGH' ? 0.55 : severity === 'MEDIUM' ? 0.7 : 0.85;
  if (!force && normalizedConfidence < threshold) return { allowed: false, reason: 'low_confidence' };

  return { allowed: true, reason: 'eligible' };
}
