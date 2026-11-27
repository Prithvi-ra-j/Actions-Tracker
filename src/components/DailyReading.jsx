import React, { useEffect, useState } from 'react';
import { getSetting, setSetting } from '../database/settingsRepository.js';
import { parseDailyReading, READING_FIELDS, READING_OPTIONS } from '../core/dailyReading.js';

export default function DailyReading({ today }) {
  const [reading, setReading] = useState({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setLoadFailed(false);
    async function load() {
      try {
        const raw = await getSetting(`dailyReading:${today}`);
        const value = raw ? parseDailyReading(raw) : {};
        if (!cancelled) {
          setReading(value);
          setSaved(!!raw);
        }
      } catch (err) {
        console.error('[DailyReading] Could not load reading:', err);
        if (!cancelled) {
          setLoadFailed(true);
          setError('Could not load your daily reading.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [today, retry]);

  async function save() {
    setSaving(true);
    setError('');
    try {
      await setSetting(`dailyReading:${today}`, JSON.stringify(reading));
      setSaved(true);
    } catch (err) {
      console.error('[DailyReading] Could not save reading:', err);
      setError('Could not save your reading. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return <details style={{ marginBottom: '12px' }}>
    <summary>Optional daily reading{saved ? ' · saved' : ''}</summary>
    <p style={{ color: 'var(--mu)', fontSize: '13px' }}>
      Check in on any of these, or skip them. Your answers are context, not a score.
    </p>
    {loading ? <p role="status">Loading reading...</p> : loadFailed ?
      <p role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></p> :
      <>
        {READING_FIELDS.map(field => <fieldset key={field.key} disabled={saving} style={{ border: 0, padding: 0, margin: '10px 0' }}>
          <legend>{field.label}</legend>
          {READING_OPTIONS.map(option => <button key={option} type="button" aria-pressed={reading[field.key] === option}
            onClick={() => {
              setReading(current => ({ ...current, [field.key]: current[field.key] === option ? null : option }));
              setSaved(false);
            }} style={{ marginRight: '8px', fontWeight: reading[field.key] === option ? 700 : 400 }}>
            {option}
          </button>)}
        </fieldset>)}
        <button type="button" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save reading'}</button>
        {error && <p role="alert">{error}</p>}
      </>}
  </details>;
}
