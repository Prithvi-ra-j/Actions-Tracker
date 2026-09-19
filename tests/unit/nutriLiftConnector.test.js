import { describe, expect, it } from 'vitest';
import { factId, toFact } from '../../src/core/sync/connectors/NutriLiftConnector.js';
import { validateNutriLiftRecord } from '../../src/core/sync/syncSchemas.js';

describe('NutriLift connector mapping', () => {
  const record = {
    external_id: 'nutrilift:workout:123',
    record_type: 'body.training.session',
    occurred_at: '2026-09-20T18:30:00.000Z',
    source_updated_at: '2026-09-20T19:00:00.000Z',
    payload: { durationMinutes: 60, totalVolumeKg: 8200 },
    schema_version: 1,
    deleted_at: null,
  };

  it('validates supported records and produces deterministic IDs', () => {
    expect(validateNutriLiftRecord(record).external_id).toBe(record.external_id);
    expect(factId(record)).toBe('fact:nutrilift:body.training.session:nutrilift:workout:123');
  });

  it('maps records to source-attributed immutable facts', () => {
    expect(toFact(record, '2026-09-20T20:00:00.000Z')).toEqual(expect.objectContaining({
      id: factId(record),
      type: 'body.training.session',
      objectId: record.external_id,
      value: record.payload,
      source: { type: 'integration', integrationId: 'nutrilift' },
    }));
  });

  it('maps source deletions to retraction facts', () => {
    const fact = toFact({ ...record, deleted_at: '2026-09-21T00:00:00.000Z' }, '2026-09-21T00:00:00.000Z');
    expect(fact.type).toBe('correction');
    expect(fact.meta.correctionType).toBe('retraction');
  });
});
