import React from 'react';
import { Label, SectionTitle, Subtitle, NavButtons } from '../shared.jsx';
import { LIFE_DIMENSIONS } from '../../../constants.js';
import { personalProgramPack } from '../../../data/starterPack.js';

export function StepHabits({ t, draft, updateDraft, onBack, onNext }) {
  const habits = draft.answers.habits || [];

  const addHabit = (template) => {
    if (habits.length >= 9) return;
    updateDraft('answers.habits', [...habits, template]);
  };

  const removeHabit = (idx) => {
    const next = [...habits];
    next.splice(idx, 1);
    updateDraft('answers.habits', next);
  };

  return (
    <>
      <Label t={t}>§ The System</Label>
      <SectionTitle>Habits</SectionTitle>
      <Subtitle t={t}>
        Pick 3–5 starter habits. If you haven't done it consistently for 8+ weeks, it's 'building'.
      </Subtitle>

      {habits.map((h, i) => (
        <div key={i} style={{ marginBottom: '1rem', padding: '1rem', background: t?.subtleBg, borderLeft: `3px solid #666` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ color: t?.pageText }}>{h.name}</strong>
            <button onClick={() => removeHabit(i)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ fontSize: '0.75rem', color: t?.muted, marginTop: '0.25rem' }}>
            {h.domain.toUpperCase()} • {h.frequency.type === 'weekly' ? `${h.frequency.days?.length}x/wk` : 'Daily'}
          </div>
          <div style={{ fontSize: '0.85rem', color: t?.pageText, marginTop: '0.5rem' }}>
            Tiny version: <span style={{ fontFamily: 'monospace' }}>{h.tinyVersion}</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: t?.pageText, marginTop: '0.25rem' }}>
            Intention: <span style={{ fontFamily: 'monospace' }}>{h.implementationIntention?.anchor} at {h.implementationIntention?.timeSlot}</span>
          </div>
        </div>
      ))}

      {habits.length < 9 && (
        <div style={{ marginTop: '1rem' }}>
          <Label t={t}>Add from Starter Pack</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {personalProgramPack.habits.map((template, i) => (
              <button
                key={i}
                onClick={() => addHabit(template)}
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', background: t?.subtleBg, border: `1px solid ${t?.border}`, color: t?.pageText, cursor: 'pointer' }}
              >
                + {template.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {habits.length > 5 && (
        <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#ffe4b5', color: '#8b4513', fontSize: '0.8rem' }}>
          Warning: More than 5 habits is hard to start at once.
        </div>
      )}

      <NavButtons t={t} onBack={onBack} onNext={onNext} canNext={habits.length > 0 && habits.length <= 9} />
    </>
  );
}

export function StepBudget({ t, draft, updateDraft, onBack, onNext }) {
  const budget = draft.answers.routine?.weeklyBudget ?? 168;
  const constraints = draft.answers.routine?.constraints || [];
  
  // simple conflict logic: block hours
  let blockedHours = 0;
  for (const c of constraints) {
    const s = parseInt(c.startTime.split(':')[0]);
    const e = parseInt(c.endTime.split(':')[0]);
    let hours = e - s;
    if (hours < 0) hours += 24; // overnight
    blockedHours += (hours * c.days.length);
  }

  const freeHours = 168 - blockedHours;
  const suggested = Math.max(0, freeHours);

  return (
    <>
      <Label t={t}>§ Capacity</Label>
      <SectionTitle>Time Budget</SectionTitle>
      <Subtitle t={t}>
        How many hours per week are truly available for this system?
      </Subtitle>

      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: t?.subtleBg, borderLeft: `3px solid #666` }}>
        <Label t={t}>Weekly Hours</Label>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            type="number" min="0" max="168"
            value={budget}
            onChange={e => updateDraft('answers.routine.weeklyBudget', Number(e.target.value))}
            style={{ width: '100px', padding: '0.5rem', background: t?.pageBg, color: t?.pageText, border: `1px solid ${t?.border}` }}
          />
          <span style={{ color: t?.pageText, fontSize: '0.9rem' }}>/ 168</span>
        </div>
        
        <p style={{ color: t?.muted, fontSize: '0.8rem', marginTop: '1rem' }}>
          You blocked ~{blockedHours} hours in Constraints, leaving {freeHours} free.
        </p>
        
        <button 
          onClick={() => updateDraft('answers.routine.weeklyBudget', suggested)}
          style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', fontSize: '0.75rem', background: 'transparent', border: `1px solid ${t?.border}`, color: t?.pageText, cursor: 'pointer' }}
        >
          Use suggested ({suggested})
        </button>
      </div>

      <NavButtons t={t} onBack={onBack} onNext={onNext} />
    </>
  );
}
