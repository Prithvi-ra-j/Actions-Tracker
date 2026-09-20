import React, { useState, useEffect } from 'react';
import { ACCENT } from '../constants.js';
import {
  requestNotificationPermission,
  scheduleAllReminders,
  NOTIFICATION_IDS,
} from '../native/notifications.js';
import { exportDatabase, importDatabase } from '../database/db.js';
import { isBrowserFallback } from '../native/secureStorage.js';
import { isSupabaseConfigured } from '../integrations/supabase/supabaseClient.js';
import { getCurrentSupabaseUser, signInWithPassword, signOutSupabase } from '../integrations/supabase/supabaseAuth.js';

/**
 * Settings panel — opened via the ⚙ icon in the header (not a tab).
 *
 * Props:
 *   t                 — current theme object
 *   dark              — boolean
 *   setDark           — setter for dark mode
 *   reminders         — Array<{ id, label, time, enabled }>
 *   setReminders      — setter for reminders (local state)
 *   onSaveReminders   — async (reminders) => void — persists to DB
 *   todayRecord       — { body, philosophy, art, history }
 *   onClose           — function to close the settings panel
 *   onRunSync         — async () => summary — runs the sync manager
 */
export default function SettingsTab({ t, dark, setDark, reminders, setReminders, onSaveReminders, todayRecord, onClose, onRunSync }) {
  const [permStatus, setPermStatus] = useState('unknown');
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiModel, setAiModel] = useState('');
  // API key verification state
  const [verifyStatus, setVerifyStatus] = useState('');  // '', 'verifying', 'success', 'error'
  const [verifyResult, setVerifyResult] = useState(null); // { model, latencyMs } or { error }
  
  const [memories, setMemories] = useState([]);

  // Load AI settings on mount
  useEffect(() => {
    import('../database/settingsRepository.js').then(m => {
      Promise.all([
        m.getSetting('aiBaseUrl'),
        m.getSetting('aiModel')
      ]).then(([url, mod]) => {
        setAiBaseUrl(url || 'https://api.groq.com/openai/v1');
        setAiModel(mod || 'gemma2-9b-it');
      });
    });

    import('../native/secureStorage.js').then(m => {
      m.getSecureValue('aiApiKey').then(key => {
        setAiApiKey(key || '');
      });
    });

    import('../database/memoryRepository.js').then(m => {
      m.getSemanticMemories().then(setMemories);
    });
  }, []);

  async function handleDeleteMemory(id) {
    if (!window.confirm("Reject this memory? It will no longer be used by the AI.")) return;
    const { rejectMemory } = await import('../database/memoryRepository.js');
    await rejectMemory(id);
    setMemories(prev => prev.filter(m => m.id !== id));
  }

  // Update a single reminder field
  function updateReminder(id, changes) {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));
  }

  async function handleRequestPerm() {
    const granted = await requestNotificationPermission();
    setPermStatus(granted ? 'granted' : 'denied');
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await onSaveReminders(reminders);
      await scheduleAllReminders(reminders, todayRecord);

      // Save AI Settings
      const { setSetting } = await import('../database/settingsRepository.js');
      await setSetting('aiBaseUrl', aiBaseUrl);
      await setSetting('aiModel', aiModel);

      const { setSecureValue } = await import('../native/secureStorage.js');
      await setSecureValue('aiApiKey', aiApiKey);

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('[Settings] save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  const permLabel =
    permStatus === 'granted'  ? '✓ Permission Granted'  :
    permStatus === 'denied'   ? '✗ Permission Denied — check device settings' :
    'Request Notification Permission';

  function handleExport() {
    exportDatabase().then(json => {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `actions_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const result = await importDatabase(ev.target.result);
        const totalRecords = Object.values(result.counts).reduce((s, n) => s + n, 0);
        const storeCount   = Object.keys(result.counts).length;
        alert(`Import successful — ${totalRecords} records restored across ${storeCount} stores.\nThe app will now reload.`);
        window.location.reload();
      } catch (err) {
        alert('Import failed:\n\n' + err.message);
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-selected if needed
    e.target.value = '';
  }

  const [syncing, setSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState(null);
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [supabaseEmail, setSupabaseEmail] = useState('');
  const [supabasePassword, setSupabasePassword] = useState('');
  const [supabaseAuthError, setSupabaseAuthError] = useState(null);
  const [supabaseAuthBusy, setSupabaseAuthBusy] = useState(false);

  useEffect(() => {
    getCurrentSupabaseUser().then(setSupabaseUser).catch(() => setSupabaseUser(null));
  }, []);

  async function handleSupabaseSignIn(event) {
    event.preventDefault();
    setSupabaseAuthBusy(true);
    setSupabaseAuthError(null);
    try {
      const result = await signInWithPassword(supabaseEmail.trim(), supabasePassword);
      setSupabaseUser(result.user);
      setSupabasePassword('');
    } catch (err) {
      setSupabaseAuthError(err.message);
    } finally {
      setSupabaseAuthBusy(false);
    }
  }

  async function handleSupabaseSignOut() {
    await signOutSupabase();
    setSupabaseUser(null);
  }

  async function handleSyncClick() {
    if (!onRunSync) return;
    setSyncing(true);
    setSyncSummary(null);
    try {
      const summary = await onRunSync();
      setSyncSummary(summary);
    } catch (err) {
      alert('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleLoadDummyData() {
    if (window.confirm("WARNING: This will completely wipe all your current data and replace it with dummy test data. Are you sure?")) {
      try {
        const { generateDummyData } = await import('../scripts/dummyDataGenerator.js');
        await generateDummyData();
        window.location.reload();
      } catch (err) {
        alert("Failed to generate dummy data: " + err.message);
      }
    }
  }

  return (
    <>
      {/* ── Section title ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Settings
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, lineHeight: 1.1 }}>Configure</div>
          {typeof __APP_VERSION__ !== 'undefined' && (
            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: t.muted, marginTop: '0.4rem', letterSpacing: '0.1em' }}>
              v{__APP_VERSION__}
            </div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close settings"
            style={{
              background: 'transparent', border: 'none', color: t.pageText,
              fontSize: '1.2rem', cursor: 'pointer', padding: '0.5rem',
              lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Appearance ────────────────────────────────────────────────────────── */}
      <div style={{ border: `1px solid ${t.border}`, borderLeft: `4px solid ${t.border}`, padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: t.muted, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Appearance
            </div>
            <div style={{ fontSize: '0.9rem' }}>
              {dark ? 'Dark Mode' : 'Light Mode'}
            </div>
          </div>
          <button
            id="btn-toggle-dark"
            onClick={() => setDark(d => !d)}
            style={{
              padding: '0.4rem 0.85rem',
              background: 'transparent',
              border: `1px solid ${t.border}`,
              color: t.pageText,
              fontFamily: 'monospace',
              fontSize: '0.65rem',
              letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >
            {dark ? '☀ LIGHT' : '☾ DARK'}
          </button>
        </div>
      </div>

      {/* ── Reminders ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.2em', color: t.muted, textTransform: 'uppercase', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${t.borderFaint}` }}>
          Reminders
        </div>

        {/* Permission button */}
        <button
          id="btn-request-notif-perm"
          onClick={handleRequestPerm}
          style={{
            width: '100%', padding: '0.7rem', marginBottom: '1rem',
            background: permStatus === 'granted' ? 'rgba(79,138,95,0.1)' : 'transparent',
            border: `1px solid ${permStatus === 'granted' ? '#4f8a5f' : t.border}`,
            color: permStatus === 'granted' ? '#4f8a5f' : t.pageText,
            fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.1em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          {permLabel}
        </button>

        {/* Per-reminder rows */}
        {reminders.map(reminder => (
          <div key={reminder.id} style={{
            border: `1px solid ${t.borderSoft}`,
            borderLeft: `4px solid ${reminder.enabled ? ACCENT : t.border}`,
            padding: '0.9rem', marginBottom: '0.5rem',
            transition: 'border-color 0.2s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: reminder.enabled ? ACCENT : t.muted, textTransform: 'uppercase' }}>
                  {reminder.label}
                </div>
                {reminder.id === NOTIFICATION_IDS.BODY && (
                  <div style={{ fontSize: '0.65rem', color: t.muted, marginTop: '0.2rem' }}>
                    Fires on Mon, Wed, Fri, Sat
                  </div>
                )}
                {reminder.id === NOTIFICATION_IDS.PHILOSOPHY && (
                  <div style={{ fontSize: '0.65rem', color: t.muted, marginTop: '0.2rem' }}>
                    Fires every day
                  </div>
                )}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id={`reminder-enabled-${reminder.id}`}
                  checked={reminder.enabled}
                  onChange={e => updateReminder(reminder.id, { enabled: e.target.checked })}
                  style={{ accentColor: ACCENT, width: 14, height: 14 }}
                />
                <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.1em', color: reminder.enabled ? ACCENT : t.muted }}>
                  {reminder.enabled ? 'ON' : 'OFF'}
                </span>
              </label>
            </div>

            <input
              type="time"
              id={`reminder-time-${reminder.id}`}
              value={reminder.time}
              onChange={e => updateReminder(reminder.id, { time: e.target.value })}
              disabled={!reminder.enabled}
              style={{
                width: '100%',
                padding: '0.4rem 0.5rem',
                background: 'transparent',
                border: `1px solid ${reminder.enabled ? t.borderSoft : t.borderFaint}`,
                color: reminder.enabled ? t.pageText : t.muted,
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
                cursor: reminder.enabled ? 'auto' : 'not-allowed',
              }}
            />
          </div>
        ))}

        {/* Save button */}
        <button
          id="btn-save-reminders"
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '0.85rem', marginTop: '0.75rem',
            background: saved ? '#4f8a5f' : ACCENT,
            border: 'none',
            color: '#fff',
            fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em',
            textTransform: 'uppercase', cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.75 : 1,
            transition: 'background 0.3s',
          }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Reminders'}
        </button>
      </div>

      {/* ── AI Engine Settings ────────────────────────────────────────────────── */}
      <div style={{ border: `1px solid ${t.border}`, borderLeft: `4px solid ${t.border}`, padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: t.muted, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          AI Engine (Jarvis)
        </div>
        <div style={{ fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5, color: t.muted }}>
          Configure your LLM provider for Insights. Supports Groq or OpenAI-compatible endpoints.
        </div>
        
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontFamily: 'monospace', fontSize: '0.65rem', color: t.muted, marginBottom: '0.25rem' }}>API Key</label>
          
          {isBrowserFallback() && (
            <div style={{ background: 'rgba(193, 68, 44, 0.1)', border: '1px solid #c1442c', padding: '0.5rem', color: '#c1442c', fontSize: '0.75rem', marginBottom: '0.5rem', borderRadius: '4px' }}>
              <strong>API key is session-only in browser</strong> — re-enter after refresh.
            </div>
          )}

          <input 
            type="password" 
            value={aiApiKey}
            onChange={(e) => { setAiApiKey(e.target.value); if (verifyStatus) setVerifyStatus(''); }}
            style={{ width: '100%', padding: '0.5rem', background: t.subtleBg, border: `1px solid ${t.borderSoft}`, color: t.pageText, fontFamily: 'monospace' }} 
            placeholder="gsk_..."
          />
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontFamily: 'monospace', fontSize: '0.65rem', color: t.muted, marginBottom: '0.25rem' }}>Base URL</label>
          <input 
            type="text" 
            value={aiBaseUrl}
            onChange={(e) => { setAiBaseUrl(e.target.value); if (verifyStatus) setVerifyStatus(''); }}
            style={{ width: '100%', padding: '0.5rem', background: t.subtleBg, border: `1px solid ${t.borderSoft}`, color: t.pageText, fontFamily: 'monospace' }} 
          />
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontFamily: 'monospace', fontSize: '0.65rem', color: t.muted, marginBottom: '0.25rem' }}>Model</label>
          <input 
            type="text" 
            value={aiModel}
            onChange={(e) => { setAiModel(e.target.value); if (verifyStatus) setVerifyStatus(''); }}
            style={{ width: '100%', padding: '0.5rem', background: t.subtleBg, border: `1px solid ${t.borderSoft}`, color: t.pageText, fontFamily: 'monospace' }} 
          />
        </div>

        {/* ── Verify Connection Button ──────────────────────────────────────── */}
        <button
          id="btn-verify-ai"
          onClick={async () => {
            setVerifyStatus('verifying');
            setVerifyResult(null);
            const { verifyLLMConnection } = await import('../core/ai/llmClient.js');
            const result = await verifyLLMConnection(aiApiKey, aiBaseUrl, aiModel);
            if (result.ok) {
              setVerifyStatus('success');
              setVerifyResult({ model: result.model, latencyMs: result.latencyMs });
            } else {
              setVerifyStatus('error');
              setVerifyResult({ error: result.error });
            }
          }}
          disabled={verifyStatus === 'verifying' || !aiApiKey.trim()}
          style={{
            width: '100%',
            padding: '0.7rem',
            background: verifyStatus === 'success' ? 'rgba(79,138,95,0.1)'
                      : verifyStatus === 'error'   ? 'rgba(193,68,44,0.06)'
                      : 'transparent',
            border: `1px solid ${
              verifyStatus === 'success' ? '#4f8a5f'
              : verifyStatus === 'error' ? '#c1442c'
              : !aiApiKey.trim() ? t.borderFaint
              : ACCENT
            }`,
            color: verifyStatus === 'success' ? '#4f8a5f'
                 : verifyStatus === 'error'   ? '#c1442c'
                 : !aiApiKey.trim() ? t.muted
                 : ACCENT,
            fontFamily: 'monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: (verifyStatus === 'verifying' || !aiApiKey.trim()) ? 'default' : 'pointer',
            opacity: verifyStatus === 'verifying' ? 0.75 : 1,
            transition: 'all 0.3s',
          }}
        >
          {verifyStatus === 'verifying' ? 'Verifying…'
           : verifyStatus === 'success' ? 'Connection Verified'
           : verifyStatus === 'error'   ? 'Verification Failed'
           : 'Verify Connection'}
        </button>

        {/* Verify result details */}
        {verifyStatus === 'success' && verifyResult && (
          <div style={{
            marginTop: '0.5rem', padding: '0.6rem',
            background: 'rgba(79,138,95,0.08)',
            border: '1px solid rgba(79,138,95,0.2)',
            fontFamily: 'monospace', fontSize: '0.6rem', color: '#4f8a5f',
            letterSpacing: '0.06em', lineHeight: 1.6,
          }}>
            <div>API key is valid and model is accessible.</div>
            <div>Model: {verifyResult.model} · Latency: {verifyResult.latencyMs}ms</div>
          </div>
        )}
        {verifyStatus === 'error' && verifyResult && (
          <div style={{
            marginTop: '0.5rem', padding: '0.6rem',
            background: 'rgba(193,68,44,0.06)',
            border: '1px solid rgba(193,68,44,0.2)',
            fontFamily: 'monospace', fontSize: '0.6rem', color: '#c1442c',
            letterSpacing: '0.06em', lineHeight: 1.6,
          }}>
            {verifyResult.error}
          </div>
        )}
      </div>

      {/* ── AI Memory ────────────────────────────────────────────────────────── */}
      <div style={{ border: `1px solid ${t.border}`, borderLeft: `4px solid ${t.border}`, padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: t.muted, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          AI Memory
        </div>
        <div style={{ fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5, color: t.muted }}>
          Facts and patterns the AI has learned about you. You can reject incorrect memories so they are no longer used.
        </div>
        
        {memories.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: t.muted, fontStyle: 'italic' }}>No confirmed memories yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {memories.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: t.subtleBg, padding: '0.75rem', border: `1px solid ${t.borderSoft}` }}>
                <span style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>{m.content}</span>
                <button
                  onClick={() => handleDeleteMemory(m.id)}
                  aria-label="Reject memory"
                  style={{ background: 'transparent', border: 'none', color: '#c1442c', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem 0.5rem', marginLeft: '0.5rem' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Integrations & Sync ────────────────────────────────────────────────── */}
      <div style={{ border: `1px solid ${t.border}`, borderLeft: `4px solid ${t.border}`, padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: t.muted, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Integrations & Sync
        </div>
        <div style={{ fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5, color: t.muted }}>
          Sync data from external health and fitness connectors into your fact ledger.
        </div>
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: t.subtleBg, fontSize: '0.75rem' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: t.muted, textTransform: 'uppercase', marginBottom: '0.45rem' }}>NutriLift cloud connection</div>
          {!isSupabaseConfigured ? (
            <div style={{ color: t.muted }}>Supabase is not configured in this deployment.</div>
          ) : supabaseUser ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
              <span>Connected as {supabaseUser.email || supabaseUser.id}</span>
              <button type="button" onClick={handleSupabaseSignOut} style={{ padding: '0.35rem 0.5rem', background: 'transparent', border: `1px solid ${t.border}`, color: t.muted, cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.58rem' }}>SIGN OUT</button>
            </div>
          ) : (
            <form onSubmit={handleSupabaseSignIn} style={{ display: 'grid', gap: '0.45rem' }}>
              <input aria-label="Supabase email" type="email" autoComplete="email" placeholder="Supabase email" value={supabaseEmail} onChange={e => setSupabaseEmail(e.target.value)} style={{ padding: '0.45rem', background: t.pageBg, color: t.pageText, border: `1px solid ${t.border}` }} />
              <input aria-label="Supabase password" type="password" autoComplete="current-password" placeholder="Supabase password" value={supabasePassword} onChange={e => setSupabasePassword(e.target.value)} style={{ padding: '0.45rem', background: t.pageBg, color: t.pageText, border: `1px solid ${t.border}` }} />
              <button type="submit" disabled={supabaseAuthBusy} style={{ padding: '0.5rem', background: ACCENT, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.6rem' }}>{supabaseAuthBusy ? 'CONNECTING...' : 'CONNECT NUTRILIFT'}</button>
              {supabaseAuthError && <div role="alert" style={{ color: '#c1442c', fontSize: '0.7rem' }}>{supabaseAuthError}</div>}
            </form>
          )}
        </div>
        
        <button
          onClick={handleSyncClick}
          disabled={syncing}
          style={{
            padding: '0.7rem',
            background: 'transparent',
            border: `1px solid ${ACCENT}`,
            color: ACCENT,
            fontFamily: 'monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            cursor: syncing ? 'default' : 'pointer',
            textTransform: 'uppercase',
            width: '100%',
            opacity: syncing ? 0.75 : 1
          }}
        >
          {syncing ? 'Syncing...' : 'Run Data Sync'}
        </button>
        {syncSummary && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: t.subtleBg, fontFamily: 'monospace', fontSize: '0.6rem', color: t.muted }}>
            <div>Last Sync: {new Date(syncSummary.completedAt).toLocaleTimeString()}</div>
            <div>Connectors run: {syncSummary.connectorsRun}</div>
            <div>Facts imported: {syncSummary.totalImported}</div>
            {syncSummary.errors.length > 0 && (
              <div style={{ color: '#c1442c', marginTop: '0.25rem' }}>
                Errors: {syncSummary.errors.map(e => e.id).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Data Safety ───────────────────────────────────────────────────────── */}
      <div style={{ border: `1px solid ${t.border}`, borderLeft: `4px solid ${t.border}`, padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: t.muted, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Data Safety
        </div>
        <div style={{ fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5, color: t.muted }}>
          Your data is stored locally on this device. Create backups regularly.
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button
            onClick={handleExport}
            style={{
              padding: '0.7rem',
              background: 'transparent',
              border: `1px solid ${t.border}`,
              color: t.pageText,
              fontFamily: 'monospace',
              fontSize: '0.65rem',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            Export Backup
          </button>
          
          <label
            style={{
              padding: '0.7rem',
              background: 'transparent',
              border: `1px solid ${t.border}`,
              color: t.pageText,
              fontFamily: 'monospace',
              fontSize: '0.65rem',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}
          >
            Import Backup
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImport} 
              style={{ display: 'none' }} 
            />
          </label>
        </div>
      </div>

      {/* ── Developer Tools ───────────────────────────────────────────────────── */}
      <div style={{ border: `1px solid ${t.border}`, borderLeft: `4px solid #c1442c`, padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: '#c1442c', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Developer Tools
        </div>
        <div style={{ fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5, color: t.muted }}>
          Wipe current database and load comprehensive dummy test data (including edge cases, stats, active/completed quests, AI insights, etc).
        </div>
        
        <button
          onClick={handleLoadDummyData}
          style={{
            padding: '0.7rem',
            background: 'rgba(193, 68, 44, 0.1)',
            border: `1px solid #c1442c`,
            color: '#c1442c',
            fontFamily: 'monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            textTransform: 'uppercase',
            width: '100%'
          }}
        >
          Wipe & Load Dummy Data
        </button>
      </div>

      {/* ── Info note ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0.85rem', background: t.subtleBg }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.08em', color: t.muted, lineHeight: 1.75 }}>
          On Android, reminders fire through the native notification system. They work when the app is closed, the screen is locked, and there is no internet connection. The "Daily Check" notification is automatically updated with your current progress each time you toggle a task.
        </div>
      </div>
    </>
  );
}
