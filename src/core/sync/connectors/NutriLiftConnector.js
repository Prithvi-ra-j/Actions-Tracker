import { BaseConnector } from '../BaseConnector.js';
import { isSupabaseConfigured } from '../../../integrations/supabase/supabaseClient.js';
import { getCurrentSupabaseUser } from '../../../integrations/supabase/supabaseAuth.js';
import { fetchNutriLiftRecords } from '../../../database/supabaseSyncRepository.js';
import { addFact, getFact } from '../../../database/factsRepository.js';

function factId(record) {
  return `fact:nutrilift:${record.record_type}:${record.external_id}`;
}

function toFact(record, importedAt) {
  const id = factId(record);
  if (record.deleted_at) {
    return {
      id,
      type: 'correction',
      objectId: record.external_id,
      value: null,
      occurredAt: record.deleted_at,
      source: { type: 'integration', integrationId: 'nutrilift' },
      meta: {
        correctionType: 'retraction',
        externalId: record.external_id,
        recordType: record.record_type,
        sourceUpdatedAt: record.source_updated_at || importedAt,
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
    meta: {
      externalId: record.external_id,
      sourceUpdatedAt: record.source_updated_at || null,
      schemaVersion: record.schema_version,
      importedAt,
    },
  };
}

export class NutriLiftConnector extends BaseConnector {
  constructor() {
    super('nutrilift', 'fitness', '1.0');
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

    const records = await fetchNutriLiftRecords(options.full ? null : syncState.cursor);
    const facts = [];
    let ignored = 0;
    const importedAt = new Date().toISOString();

    for (const record of records) {
      const id = factId(record);
      if (await getFact(id)) {
        ignored += 1;
        continue;
      }
      facts.push(toFact(record, importedAt));
    }

    const cursor = records.reduce((latest, record) => {
      const candidate = record.source_updated_at || latest;
      return candidate > latest ? candidate : latest;
    }, syncState.cursor || '');

    return this.createSyncResult('success', facts.length, 0, ignored, cursor || syncState.cursor || null, [], startedAt, facts);
  }
}

export { factId, toFact };