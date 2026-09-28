import { requireSupabase } from '../integrations/supabase/supabaseClient.js';
import { getCurrentSupabaseUser } from '../integrations/supabase/supabaseAuth.js';
import { validateNutriLiftRecord } from '../core/sync/syncSchemas.js';

const TABLE = 'sync_records';
const DEFAULT_BATCH_SIZE = 100;

function encodeCursor(record) {
  return JSON.stringify({
    sourceUpdatedAt: record.source_updated_at,
    externalId: record.external_id,
  });
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(cursor);
    if (parsed?.sourceUpdatedAt && parsed?.externalId) return parsed;
  } catch {}
  // Backward compatibility with the previous timestamp-only cursor.
  return { sourceUpdatedAt: cursor, externalId: '' };
}

export async function fetchNutriLiftRecords({ cursor = null, limit = DEFAULT_BATCH_SIZE } = {}) {
  const user = await getCurrentSupabaseUser();
  if (!user) throw new Error('Sign in to Supabase before syncing NutriLift.');

  const safeLimit = Math.max(1, Math.min(Number(limit) || DEFAULT_BATCH_SIZE, 100));
  const decoded = decodeCursor(cursor);

  let query = requireSupabase()
    .from(TABLE)
    .select('external_id, record_type, occurred_at, source_updated_at, payload, schema_version, deleted_at, updated_at')
    .eq('user_id', user.id)
    .eq('source_app', 'nutrilift')
    .order('source_updated_at', { ascending: true, nullsFirst: false })
    .order('external_id', { ascending: true })
    .limit(safeLimit);

  if (decoded?.sourceUpdatedAt) {
    // The two-part cursor prevents equal-timestamp records from being skipped
    // when a page boundary cuts through a batch sharing one source timestamp.
    query = query.or(
      `source_updated_at.gt.${decoded.sourceUpdatedAt},and(source_updated_at.eq.${decoded.sourceUpdatedAt},external_id.gt.${decoded.externalId})`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return {
    records: (data || []).map(validateNutriLiftRecord),
    nextCursor: data?.length ? encodeCursor(data[data.length - 1]) : cursor || null,
  };
}
