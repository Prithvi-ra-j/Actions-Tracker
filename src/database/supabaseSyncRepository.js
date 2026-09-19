import { requireSupabase } from '../integrations/supabase/supabaseClient.js';
import { getCurrentSupabaseUser } from '../integrations/supabase/supabaseAuth.js';
import { validateNutriLiftRecord } from '../core/sync/syncSchemas.js';

// Shared with NutriLift's `syncRepository.ts` upload path.
const TABLE = 'sync_records';

export async function fetchNutriLiftRecords(cursor = null) {
  const user = await getCurrentSupabaseUser();
  if (!user) throw new Error('Sign in to Supabase before syncing NutriLift.');

  let query = requireSupabase()
    .from(TABLE)
    .select('external_id, record_type, occurred_at, source_updated_at, payload, schema_version, deleted_at')
    .eq('user_id', user.id)
    .eq('source_app', 'nutrilift')
    .order('source_updated_at', { ascending: true });

  if (cursor) query = query.gt('source_updated_at', cursor);
  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(validateNutriLiftRecord);
}
