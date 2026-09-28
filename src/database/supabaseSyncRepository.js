import { requireSupabase } from '../integrations/supabase/supabaseClient.js';
import { getCurrentSupabaseUser } from '../integrations/supabase/supabaseAuth.js';
import { validateNutriLiftRecord } from '../core/sync/syncSchemas.js';

const TABLE = 'sync_records';
const DEFAULT_BATCH_SIZE = 100;

export async function fetchNutriLiftRecords({ cursor = null, limit = DEFAULT_BATCH_SIZE } = {}) {
  const user = await getCurrentSupabaseUser();
  if (!user) throw new Error('Sign in to Supabase before syncing NutriLift.');

  const safeLimit = Math.max(1, Math.min(Number(limit) || DEFAULT_BATCH_SIZE, 100));

  let query = requireSupabase()
    .from(TABLE)
    .select('external_id, record_type, occurred_at, source_updated_at, payload, schema_version, deleted_at, updated_at')
    .eq('user_id', user.id)
    .eq('source_app', 'nutrilift')
    .order('source_updated_at', { ascending: true })
    .order('external_id', { ascending: true })
    .limit(safeLimit);

  if (cursor) query = query.gt('source_updated_at', cursor);
  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(validateNutriLiftRecord);
}
