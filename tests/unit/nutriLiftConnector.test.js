import { beforeEach, describe, expect, it, vi } from 'vitest';

const records = vi.hoisted(() => ({ current: [] }));

vi.mock('../../src/integrations/supabase/supabaseClient.js', () => ({ isSupabaseConfigured: true }));
vi.mock('../../src/integrations/supabase/supabaseAuth.js', () => ({
  getCurrentSupabaseUser: vi.fn(async () => ({ id: 'user-a' })),
}));
vi.mock('../../src/database/supabaseSyncRepository.js', () => ({
  fetchNutriLiftRecords: vi.fn(async () => ({
    records: records.current,
    nextCursor: records.current.length ? JSON.stringify({
      sourceUpdatedAt: records.current.at(-1).source_updated_at,
      externalId: records.current.at(-1).external_id,
    }) : null,
  })),
}));
vi.mock('../../src/database/factsRepository.js', () => ({
  getFact: vi.fn(async id => records.currentFacts?.find(f => f.id === id) || null),
  getAllFacts: vi.fn(async () => records.currentFacts || []),
  addFact: vi.fn(),
}));

import { factId, NutriLiftConnector } from '../../src/core/sync/connectors/NutriLiftConnector.js';

const base = {
  external_id: 'nutrilift:workout_session:123',
  record_type: 'body.training.session',
  occurred_at: '2026-09-28T08:00:00.000Z',
  source_updated_at: '2026-09-28T08:01:00.000Z',
  payload: { durationMin: 60 },
  schema_version: 1,
  deleted_at: null,
};

describe('NutriLiftConnector', () => {
  beforeEach(() => {
    records.current = [];
    records.currentFacts = [];
  });

  it('creates a deterministic fact on first sync', async () => {
    records.current = [base];
    const result = await new NutriLiftConnector().sync({}, {});
    expect(result.facts).toHaveLength(1);
    expect(result.facts[0].id).toBe(factId(base));
  });

  it('ignores identical replays', async () => {
    records.current = [base];
    records.currentFacts = [{ id: factId(base), type: base.record_type, meta: { sourceUpdatedAt: base.source_updated_at } }];
    const cursor = JSON.stringify({ sourceUpdatedAt: base.source_updated_at, externalId: base.external_id });
    const result = await new NutriLiftConnector().sync({}, { cursor });
    expect(result.facts).toHaveLength(0);
    expect(result.ignored).toBe(1);
  });

  it('emits an updated source projection when the source version changes', async () => {
    const newer = { ...base, source_updated_at: '2026-09-28T09:01:00.000Z', payload: { durationMin: 75 } };
    records.current = [newer];
    records.currentFacts = [{ id: factId(base), type: base.record_type, meta: { sourceUpdatedAt: base.source_updated_at } }];
    const result = await new NutriLiftConnector().sync({}, {});
    expect(result.facts[0].id).toBe(factId(newer));
    expect(result.updated).toBe(1);
  });

  it('turns a deletion into an immutable retraction fact', async () => {
    const deleted = { ...base, deleted_at: '2026-09-28T10:00:00.000Z', source_updated_at: '2026-09-28T10:00:00.000Z' };
    records.current = [deleted];
    records.currentFacts = [{ id: factId(base), type: base.record_type, meta: { sourceUpdatedAt: base.source_updated_at } }];
    const result = await new NutriLiftConnector().sync({}, {});
    expect(result.facts[0].type).toBe('retraction');
    expect(result.facts[0].objectId).toBe(factId(base));
  });

  it('advances the cursor to the newest source version in the fetched batch', async () => {
    records.current = [
      base,
      { ...base, external_id: 'nutrilift:workout_session:124', source_updated_at: '2026-09-28T09:00:00.000Z' },
    ];
    const result = await new NutriLiftConnector().sync({}, {});
    expect(result.cursor).toBe(JSON.stringify({
      sourceUpdatedAt: '2026-09-28T09:00:00.000Z',
      externalId: 'nutrilift:workout_session:124',
    }));
  });
});
