import { BaseConnector } from '../BaseConnector.js';
import { isSupabaseConfigured } from '../../../integrations/supabase/supabaseClient.js';
import { getCurrentSupabaseUser } from '../../../integrations/supabase/supabaseAuth.js';
import { fetchNutriLiftRecords } from '../../../database/supabaseSyncRepository.js';
import { getAllFacts } from '../../../database/factsRepository.js';

function factId(record) {
  return `fact:nutrilift:${record.record_type}:${record.external_id}`;
}

function sourceVersion(record) {
  return record.source_updated_at || record.updated_at || record.occurred_at;
}

function toFact(record, importedAt) {
  const id = factId(record);
  const version = sourceVersion(record);
  const provenance = {
    externalId: record.external_id,
    recordType: record.record_type,
    sourceUpdatedAt: version,
    schemaVersion: record.schema_version,
    importedAt,
  };

  if (record.deleted_at) {
    return {
      id: `${id}:retraction:${version}`,
      type: 'retraction',
      objectId: id,
      value: 1,
      occurredAt: record.deleted_at,
      source: { type: 'integration', integrationId: 'nutrilift' },
      meta: {
        retractedFactId: id,
        externalId: record.external_id,
        recordType: record.record_type,
        sourceUpdatedAt: version,
        correctionType: 'retraction',
      },
    };
  }

  return {
    id,
    type: record.record_type,
    objectId: record.external_id,
    value: record.payload,
    occurredAt: record.occurred_at,
    source: { type: 'integration', integrationId: 'nutrilift' },
    meta: provenance,
  };
}

function getLatestNutriLiftFact(facts, baseId) {
  return facts
    .filter(f => f.id === baseId || f.meta?.sourceFactId === baseId)
    .sort((a, b) => String(a.meta?.sourceUpdatedAt || a.recordedAt || '').localeCompare(String(b.meta?.sourceUpdatedAt || b.recordedAt || '')))
    .at(-1) || null;
}

export class NutriLiftConnector extends BaseConnector {
  constructor() {
    super('nutrilift', 'fitness', '1.1');
  }

  async getStatus() {
    if (!isSupabaseConfigured) return 'disconnected';
    return (await getCurrentSupabaseUser()) ? 'connected' : 'disconnected';
  }

  async connect() {
    const status = await this.getStatus();
    return status === 'connected'
      ? { success: true, message: 'NutriLift sync is connected.' }
      : { success: false, message: 'Configure Supabase and sign in before syncing NutriLift.' };
  }

  async disconnect() {
    return undefined;
  }

  async sync(options = {}, syncState = {}) {
    const startedAt = new Date().toISOString();
    if (await this.getStatus() !== 'connected') {
      return this.createSyncResult(
        'failed', 0, 0, 0, syncState.cursor || null,
        [{ message: 'NutriLift Supabase session is unavailable.' }], startedAt
      );
    }

    const page = await fetchNutriLiftRecords({
      cursor: options.full ? null : syncState.cursor,
      limit: options.batchSize || 100,
    });
    const records = page.records;
    const existingFacts = await getAllFacts();
    const facts = [];
    let ignored = 0;
    let updated = 0;
    const importedAt = new Date().toISOString();

    for (const record of records) {
      const baseId = factId(record);
      const existing = getLatestNutriLiftFact(existingFacts, baseId);
      const incomingVersion = sourceVersion(record);
      const existingVersion = existing?.meta?.sourceUpdatedAt || null;

      if (existing && existingVersion && incomingVersion <= existingVersion && !record.deleted_at) {
        ignored += 1;
        continue;
      }

      if (existing && record.deleted_at && existing?.type === 'retraction') {
        ignored += 1;
        continue;
      }

      const fact = toFact(record, importedAt);
      if (existing && !record.deleted_at) updated += 1;
      facts.push(fact);
    }

    if (records.length === 0) {
      return this.createSyncResult('success', 0, 0, ignored, syncState.cursor || null, [], startedAt, []);
    }

    const cursor = page.nextCursor || syncState.cursor || '';

    return this.createSyncResult(
      'success',
      facts.length,
      updated,
      ignored,
      cursor || syncState.cursor || null,
      [],
      startedAt,
      facts,
    );
  }
}

export { factId, toFact, sourceVersion };
