import React, { useState } from 'react';
import { BottomSheet } from './ui/Overlays.jsx';
import { Button } from './ui/Buttons.jsx';
import AttributionFields from './AttributionFields.jsx';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fieldStyle = {
  minHeight: '44px', padding: '0 12px', borderRadius: 'var(--r-control)',
  background: 'var(--s2)', color: 'var(--tx)', border: '1px solid var(--hairline)', font: 'inherit',
};

function EditHabit({ habit, onSave, onClose }) {
  const [name, setName] = useState(habit.name);
  const [tiny, setTiny] = useState(habit.tinyVersion || '');
  const [domain, setDomain] = useState(habit.domain || 'general');
  const [secondary, setSecondary] = useState(habit.secondaryDomain || '');
  const [share, setShare] = useState(habit.secondaryDomain ? (habit.primaryShare ?? 50) : 50);
  const [slot, setSlot] = useState(habit.implementationIntention?.timeSlot || '');
  const savedDays = habit.frequency?.days || [];
  const [schedule, setSchedule] = useState(habit.frequency?.type === 'daily' || !habit.frequency ? 'daily'
    : JSON.stringify([...savedDays].sort()) === JSON.stringify([1, 2, 3, 4, 5]) ? 'weekdays' : 'custom');
  const [days, setDays] = useState(savedDays.length ? savedDays : [1, 2, 3, 4, 5]);
  const [reminderEnabled, setReminderEnabled] = useState(!!habit.reminder?.enabled);
  const [reminderTime, setReminderTime] = useState(habit.reminder?.time || '08:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function save(status = habit.status) {
    if (!name.trim() || (schedule === 'custom' && !days.length)) {
      setError('Enter a habit name and select at least one day.');
      return;
    }
    if (secondary && domain === 'general') {
      setError('Choose a primary attribute before adding a second.');
      return;
    }
    if (reminderEnabled && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) {
      setError('Choose a valid reminder time.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSave(habit, {
        name: name.trim(),
        domain,
        secondaryDomain: secondary || null,
        primaryShare: secondary ? share : 100,
        tinyVersion: tiny.trim() || null,
        implementationIntention: { ...habit.implementationIntention, timeSlot: slot },
        frequency: schedule === 'daily' ? { type: 'daily' } : {
          type: 'weekly', days: schedule === 'weekdays' ? [1, 2, 3, 4, 5] : [...days].sort(),
        },
        reminder: { ...habit.reminder, enabled: reminderEnabled, time: reminderTime },
        status,
      });
      onClose();
    } catch (err) {
      console.error('[HabitEditor] Could not update habit:', err);
      setError(err?.message || 'Could not save your habit. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function snooze() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { snoozeHabitReminder } = await import('../native/habitReminders.js');
      await snoozeHabitReminder(habit);
      setNotice('Reminder scheduled for 15 minutes from now.');
    } catch (err) {
      console.error('[HabitEditor] Could not snooze reminder:', err);
      setError(err?.message || 'Could not snooze this reminder.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      <label>Name <input style={{ ...fieldStyle, width: '100%' }} value={name} maxLength={120} onChange={event => setName(event.target.value)} /></label>
      <AttributionFields primary={domain} secondary={secondary} share={share} onPrimary={setDomain}
        onSecondary={setSecondary} onShare={setShare} />
      <p style={{ margin: 0, color: 'var(--mu)', fontSize: '13px' }}>Changes apply to future completions; earlier records keep their attribution.</p>
      <label>Tiny version <input style={{ ...fieldStyle, width: '100%' }} value={tiny} maxLength={120} onChange={event => setTiny(event.target.value)} /></label>
      <label>Time of day <select style={{ ...fieldStyle, width: '100%' }} value={slot} onChange={event => setSlot(event.target.value)}>
        <option value="">Any time</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option>
      </select></label>
      <label>Days <select style={{ ...fieldStyle, width: '100%' }} value={schedule} onChange={event => setSchedule(event.target.value)}>
        <option value="daily">Every day</option><option value="weekdays">Weekdays</option><option value="custom">Choose days</option>
      </select></label>
      {schedule === 'custom' && <fieldset><legend>Scheduled days</legend>
        {DAYS.map((day, index) => <label key={day} style={{ marginRight: '8px' }}>
          <input type="checkbox" checked={days.includes(index)} onChange={event => setDays(event.target.checked ? [...days, index] : days.filter(value => value !== index))} /> {day}
        </label>)}
      </fieldset>}
      <label><input type="checkbox" checked={reminderEnabled} onChange={event => setReminderEnabled(event.target.checked)} /> Per-habit reminder</label>
      {reminderEnabled && <label>Reminder time <input type="time" style={fieldStyle} value={reminderTime} onChange={event => setReminderTime(event.target.value)} /></label>}
      <p style={{ margin: 0, color: 'var(--mu)', fontSize: '13px' }}>{habit.completedDays} recorded completed {habit.completedDays === 1 ? 'day' : 'days'}. Rest days do not count as missed.</p>
      {habit.reminder?.enabled && habit.status === 'active' && <Button variant="secondary" disabled={busy} onClick={snooze}>Snooze reminder for 15 minutes</Button>}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
      <Button disabled={busy} onClick={() => save()}>Save changes</Button>
      <Button variant="secondary" disabled={busy} onClick={() => save(habit.status === 'paused' ? 'active' : 'paused')}>{habit.status === 'paused' ? 'Resume habit' : 'Pause habit'}</Button>
      <Button variant="secondary" disabled={busy} onClick={() => { if (window.confirm('Archive this habit? Its history will be kept.')) save('archived'); }}>Archive habit</Button>
    </div>
  );
}

export default function HabitEditor({ habits, open, onClose, onSave, selectedId, onSelect }) {
  const selected = habits.find(habit => habit.id === selectedId);
  return <BottomSheet isOpen={open} onClose={onClose} title={selected ? `Edit ${selected.name}` : 'Manage habits'}>
    {selected
      ? <EditHabit key={selected.id} habit={selected} onSave={onSave} onClose={() => onSelect(null)} />
      : <div style={{ display: 'grid', gap: '10px' }}>
        {habits.length === 0 && <p>No habits to manage yet.</p>}
        {habits.map(habit => <Button key={habit.id} variant="secondary" onClick={() => onSelect(habit.id)}>
          {habit.name}{habit.status === 'paused' ? ' (paused)' : ''}
        </Button>)}
      </div>}
  </BottomSheet>;
}
