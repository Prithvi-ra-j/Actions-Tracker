import { isSupabaseConfigured, requireSupabase } from './supabaseClient.js';

export async function getCurrentSupabaseUser() {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await requireSupabase().auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

export async function getSupabaseSession() {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

export async function signInWithPassword(email, password) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutSupabase() {
  if (!isSupabaseConfigured) return;
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}
