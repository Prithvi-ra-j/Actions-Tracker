import { describe, expect, it } from 'vitest';
import { normalizeEvidence, isRetractedEvidence } from '../../src/core/evidence/evidenceNormalizer.js';
import { createEvidence } from '../../src/models/evidenceSchema.js';

describe('canonical evidence normalization', () => {
  it('normalizes domain, provenance, observation time and fact references', () => {
    const normalized = normalizeEvidence({
      domain: 'strength',
      source: { type: 'integration', integrationId: 'health_connect' },
      observedAt: '2026-09-28T08:00:00.000Z',
      supportingFactIds: ['a', 'a', 'b'],
    });
    expect(normalized.domain).toBe('body');
    expect(normalized.source).toEqual({
      type: 'integration',
      integrationId: 'health_connect',
      actorId: null,
    });
    expect(normalized.occurredAt).toBe('2026-09-28T08:00:00.000Z');
    expect(normalized.supportingFactIds).toEqual(['a', 'b']);
  });

  it('creates evidence with canonical provenance fields', () => {
    const evidence = createEvidence({
      domain: 'body',
      signal: 'training_sessions',
      value: 3,
      confidence: 0.8,
      timeWindow: { start: '2026-09-22T00:00:00.000Z', end: '2026-09-28T00:00:00.000Z' },
      supportingFactIds: ['fact-1'],
      source: 'user',
      methodology: { engineId: 'test', engineVersion: '1' },
    });
    expect(evidence.source.type).toBe('user');
    expect(evidence.status).toBe('active');
    expect(evidence.freshness).toBe(1);
  });

  it('recognizes retracted evidence without deleting the record', () => {
    expect(isRetractedEvidence({ status: 'retracted' })).toBe(true);
    expect(isRetractedEvidence({ meta: { correctionType: 'retraction' } })).toBe(true);
    expect(isRetractedEvidence({ status: 'active' })).toBe(false);
  });
});
