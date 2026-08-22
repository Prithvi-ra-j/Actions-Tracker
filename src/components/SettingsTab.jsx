import React, { useState, useEffect } from 'react';
import { ACCENT } from '../constants.js';
import {
  requestNotificationPermission,
  scheduleAllReminders,
  NOTIFICATION_IDS,
} from '../native/notifications.js';
import { exportDatabase, importDatabase } from '../database/db.js';

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
 */
export default function SettingsTab({ t, dark, setDark, reminders, setReminders, onSaveReminders, todayRecord, onClose }) {
  const [permStatus, setPermStatus] = useState('unknown');
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

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
      a.download = `year_end_goals_backup_${new Date().toISOString().slice(0, 10)}.json`;
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
        await importDatabase(ev.target.result);
        alert('Import successful. The app will now reload.');
        window.location.reload();
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
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
            <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', letterSpacing: '0.15em', color: t.muted, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
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
              fontSize: '0.7rem',
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
        <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', letterSpacing: '0.2em', color: t.muted, textTransform: 'uppercase', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${t.borderFaint}` }}>
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
            fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: '0.1em',
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
                <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: '0.15em', color: reminder.enabled ? ACCENT : t.muted, textTransform: 'uppercase' }}>
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
                <span style={{ fontFamily: 'monospace', fontSize: '0.66rem', letterSpacing: '0.1em', color: reminder.enabled ? ACCENT : t.muted }}>
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
            fontFamily: 'monospace', fontSize: '0.75rem', letterSpacing: '0.15em',
            textTransform: 'uppercase', cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.75 : 1,
            transition: 'background 0.3s',
          }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Reminders'}
        </button>
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

      {/* ── Info note ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0.85rem', background: t.subtleBg }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.64rem', letterSpacing: '0.08em', color: t.muted, lineHeight: 1.75 }}>
          On Android, reminders fire through the native notification system. They work when the app is closed, the screen is locked, and there is no internet connection. The "Daily Check" notification is automatically updated with your current progress each time you toggle a task.
        </div>
      </div>
    </>
  );
}
