import React, { useEffect, useState } from 'react';
import { ACCENT } from '../constants.js';
import { getAllHabits, updateHabit } from '../database/habitRepository.js';

const EMPTY_LEVEL = {
  name: '',
  benchmark: '',
  evidenceType: 'count',
  evidenceThreshold: { type: 'count', value: 1 },
  estimatedWeeks: 4,
  tinyVersion: '',
  deliberatePracticeNote: '',
};

function roadmapFor(habit) {
  return habit.masteryRoadmap || { currentLevel: 1, levels: [{ level: 1, ...EMPTY_LEVEL }] };
}

function fieldStyle(t) {
  return {
    width: '100%', boxSizing: 'border-box', padding: '0.45rem',
    background: t.pageBg, color: t.pageText, border: `1px solid ${t.border}`,
    fontSize: '0.75rem', fontFamily: 'inherit',
  };
}

function LevelEditor({ t, level, index, onChange, onRemove, canRemove }) {
  const update = (key, value) => onChange({ ...level, [key]: value });
  return (
    <div style={{ border: `1px solid ${t.border}`, padding: '0.75rem', marginTop: '0.6rem', background: t.pageBg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <strong style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: ACCENT }}>LEVEL {index + 1}</strong>
        {canRemove && <button type="button" onClick={onRemove} style={{ border: 'none', background: 'transparent', color: t.muted, cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.6rem' }}>REMOVE</button>}
      </div>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        <input aria-label={`Level ${index + 1} name`} placeholder="Level name" value={level.name || ''} onChange={e => update('name', e.target.value)} style={fieldStyle(t)} />
        <input aria-label={`Level ${index + 1} benchmark`} placeholder="Benchmark" value={level.benchmark || ''} onChange={e => update('benchmark', e.target.value)} style={fieldStyle(t)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <select aria-label={`Level ${index + 1} evidence type`} value={level.evidenceType || 'count'} onChange={e => update('evidenceType', e.target.value)} style={fieldStyle(t)}>
            {['photo', 'count', 'duration', 'self-assessment', 'external'].map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <input aria-label={`Level ${index + 1} estimated weeks`} type="number" min="1" value={level.estimatedWeeks || 1} onChange={e => update('estimatedWeeks', Math.max(1, Number(e.target.value) || 1))} style={fieldStyle(t)} />
        </div>
        <input aria-label={`Level ${index + 1} evidence threshold`} type="number" min="0" value={level.evidenceThreshold?.value ?? 1} onChange={e => update('evidenceThreshold', { ...(level.evidenceThreshold || {}), type: level.evidenceType || 'count', value: Math.max(0, Number(e.target.value) || 0) })} style={fieldStyle(t)} />
        <input aria-label={`Level ${index + 1} tiny version`} placeholder="Tiny version" value={level.tinyVersion || ''} onChange={e => update('tinyVersion', e.target.value)} style={fieldStyle(t)} />
        <textarea aria-label={`Level ${index + 1} deliberate practice note`} placeholder="Deliberate practice note" rows={2} value={level.deliberatePracticeNote || ''} onChange={e => update('deliberatePracticeNote', e.target.value)} style={fieldStyle(t)} />
      </div>
    </div>
  );
}

export default function HabitRoadmapEditor({ t }) {
  const [habits, setHabits] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    getAllHabits().then(records => {
      const active = records.filter(habit => habit.status === 'active');
      setHabits(active);
      if (active[0]) {
        setSelectedId(active[0].id);
        setDraft(roadmapFor(active[0]));
      }
    }).catch(error => setMessage(error.message));
  }, []);

  const selectHabit = id => {
    const habit = habits.find(item => item.id === id);
    setSelectedId(id);
    setDraft(habit ? roadmapFor(habit) : null);
    setMessage(null);
  };

  const updateLevel = (index, level) => {
    setDraft(current => ({ ...current, levels: current.levels.map((item, itemIndex) => itemIndex === index ? { ...level, level: index + 1 } : item) }));
  };

  const save = async () => {
    if (!draft || draft.levels.length === 0) return setMessage('A roadmap needs at least one level.');
    const currentLevel = Math.min(Math.max(Number(draft.currentLevel) || 1, 1), draft.levels.length);
    const levels = draft.levels.map((level, index) => ({ ...level, level: index + 1, evidenceThreshold: { ...(level.evidenceThreshold || {}), type: level.evidenceType || 'count' } }));
    await updateHabit(selectedId, { masteryRoadmap: { ...draft, currentLevel, levels } });
    setHabits(current => current.map(habit => habit.id === selectedId ? { ...habit, masteryRoadmap: { ...draft, currentLevel, levels } } : habit));
    setDraft({ ...draft, currentLevel, levels });
    setMessage('Roadmap saved.');
  };

  return (
    <section>
      <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.75rem', marginTop: '1.5rem' }}>§ Habit Mastery Roadmaps</div>
      {habits.length === 0 ? <div style={{ color: t.muted, fontSize: '0.75rem' }}>No active habits yet.</div> : (
        <>
          <select aria-label="Habit roadmap" value={selectedId || ''} onChange={e => selectHabit(e.target.value)} style={fieldStyle(t)}>
            {habits.map(habit => <option key={habit.id} value={habit.id}>{habit.name}</option>)}
          </select>
          {draft && (
            <div style={{ marginTop: '0.6rem' }}>
              <label style={{ display: 'block', fontFamily: 'monospace', fontSize: '0.6rem', color: t.muted }}>CURRENT LEVEL</label>
              <input aria-label="Current mastery level" type="number" min="1" max={draft.levels.length} value={draft.currentLevel || 1} onChange={e => setDraft({ ...draft, currentLevel: Number(e.target.value) })} style={{ ...fieldStyle(t), marginTop: '0.25rem' }} />
              {draft.levels.map((level, index) => <LevelEditor key={index} t={t} level={level} index={index} canRemove={draft.levels.length > 1} onChange={next => updateLevel(index, next)} onRemove={() => setDraft({ ...draft, levels: draft.levels.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, level: itemIndex + 1 })) })} />)}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                <button type="button" onClick={() => setDraft({ ...draft, levels: [...draft.levels, { level: draft.levels.length + 1, ...EMPTY_LEVEL }] })} style={{ padding: '0.45rem 0.7rem', border: `1px solid ${t.border}`, background: 'transparent', color: t.pageText, cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.6rem' }}>ADD LEVEL</button>
                <button type="button" onClick={save} style={{ padding: '0.45rem 0.7rem', border: 'none', background: ACCENT, color: '#fff', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.6rem' }}>SAVE ROADMAP</button>
              </div>
              {message && <div role="status" style={{ marginTop: '0.5rem', color: t.muted, fontSize: '0.7rem' }}>{message}</div>}
            </div>
          )}
        </>
      )}
    </section>
  );
}
