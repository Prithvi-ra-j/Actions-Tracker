import React, { useState } from 'react';
import { Label, SectionTitle, Subtitle, NavButtons, SelectableTags } from '../shared.jsx';
import { AIInput } from '../AIInput.jsx';
import { parseIdentity } from '../../../core/onboarding/onboardingAI.js';
import { LIFE_DIMENSIONS } from '../../../constants.js';

export function StepIdentity({ t, draft, updateDraft, onBack, onNext }) {
  const identity = draft.answers.identity || {};
  const update = (key, val) => updateDraft(`answers.identity.${key}`, val);
  const aiEnabled = draft.settings?.aiAssistEnabled;

  const handleAI = async (text) => {
    const res = await parseIdentity(text);
    if (res.oneLiner) update('oneLiner', res.oneLiner);
    if (res.roles?.length) update('roles', res.roles.map(r => r.text));
    if (res.values?.length) update('values', res.values.map(v => v.text));
    if (res.strengths?.length) update('strengths', res.strengths.map(s => s.text));
    if (res.softConstraints?.length) update('constraints', res.softConstraints.map(c => c.text));
  };

  return (
    <>
      <Label t={t}>§ Who you are</Label>
      <SectionTitle>Identity</SectionTitle>
      <Subtitle t={t}>
        These answers anchor the whole system. Be specific — generic answers will give you generic outputs.
      </Subtitle>

      {aiEnabled && (
        <AIInput 
          t={t} 
          onSubmit={handleAI} 
          placeholder="Describe who you are, your roles, what you value, and your current life constraints..."
        />
      )}

      <div style={{ marginBottom: '1rem' }}>
        <Label t={t}>One sentence about who you are</Label>
        <input
          value={identity.oneLiner || ''}
          onChange={e => update('oneLiner', e.target.value)}
          placeholder='e.g. "I am someone who builds things and reads seriously."'
          style={{
            width: '100%', padding: '0.75rem',
            background: t?.subtleBg, border: `1px solid ${t?.border}`,
            color: t?.pageText, fontFamily: 'Georgia, serif', fontSize: '0.9rem',
            boxSizing: 'border-box', outline: 'none',
          }}
        />
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <Label t={t}>Roles you hold</Label>
        <SelectableTags 
          t={t} value={identity.roles || []} onChange={v => update('roles', v)} 
          options={['athlete', 'builder', 'reader', 'creator', 'engineer', 'writer', 'parent', 'leader', 'student']}
        />
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <Label t={t}>Values you actually live by</Label>
        <SelectableTags 
          t={t} value={identity.values || []} onChange={v => update('values', v)} 
          options={['discipline', 'honesty', 'craft', 'courage', 'curiosity', 'focus', 'resilience']}
        />
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <Label t={t}>Real strengths</Label>
        <SelectableTags 
          t={t} value={identity.strengths || []} onChange={v => update('strengths', v)} 
          options={['consistent', 'analytical', 'creative', 'calm', 'determined', 'adaptable']}
        />
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <Label t={t}>Real constraints (be honest)</Label>
        <SelectableTags 
          t={t} value={identity.constraints || []} onChange={v => update('constraints', v)} 
          options={['limited mornings', 'high stress work', 'travel often', 'frequent interruptions', 'low energy']}
        />
      </div>

      <NavButtons
        t={t}
        onBack={onBack}
        onNext={onNext}
        canNext={(identity.roles?.length > 0) || (identity.values?.length > 0)}
      />
    </>
  );
}

export function StepConstraints({ t, draft, updateDraft, onBack, onNext }) {
  const constraints = draft.answers.routine?.constraints || [];
  
  const addConstraint = () => {
    const newConstraint = { label: '', kind: 'work', days: [1,2,3,4,5], startTime: '09:00', endTime: '17:00' };
    updateDraft('answers.routine.constraints', [...constraints, newConstraint]);
  };

  const update = (idx, field, val) => {
    const updated = [...constraints];
    updated[idx] = { ...updated[idx], [field]: val };
    updateDraft('answers.routine.constraints', updated);
  };

  const remove = (idx) => {
    const updated = [...constraints];
    updated.splice(idx, 1);
    updateDraft('answers.routine.constraints', updated);
  };

  return (
    <>
      <Label t={t}>§ The Container</Label>
      <SectionTitle>Hard time constraints</SectionTitle>
      <Subtitle t={t}>
        When is your time not your own? (Work, commute, sleep). 
      </Subtitle>

      {constraints.map((c, i) => (
        <div key={i} style={{ marginBottom: '1rem', padding: '1rem', background: t?.subtleBg, borderLeft: `3px solid #666` }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input 
              value={c.label} 
              onChange={e => update(i, 'label', e.target.value)}
              placeholder="e.g. Day Job"
              style={{ flex: 1, padding: '0.4rem', background: t?.pageBg, border: `1px solid ${t?.border}`, color: t?.pageText }}
            />
            <select 
              value={c.kind} 
              onChange={e => update(i, 'kind', e.target.value)}
              style={{ padding: '0.4rem', background: t?.pageBg, border: `1px solid ${t?.border}`, color: t?.pageText }}
            >
              <option value="work">Work</option>
              <option value="commute">Commute</option>
              <option value="sleep">Sleep</option>
              <option value="fixed">Fixed</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
             <input type="time" value={c.startTime} onChange={e => update(i, 'startTime', e.target.value)} style={{ padding: '0.4rem', background: t?.pageBg, border: `1px solid ${t?.border}`, color: t?.pageText }} />
             <span style={{ alignSelf: 'center' }}>to</span>
             <input type="time" value={c.endTime} onChange={e => update(i, 'endTime', e.target.value)} style={{ padding: '0.4rem', background: t?.pageBg, border: `1px solid ${t?.border}`, color: t?.pageText }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
             <div style={{ display: 'flex', gap: '0.25rem' }}>
                {['S','M','T','W','T','F','S'].map((dayChar, d) => (
                  <button 
                    key={d}
                    type="button"
                    onClick={() => {
                      const newDays = c.days.includes(d) ? c.days.filter(x => x !== d) : [...c.days, d];
                      update(i, 'days', newDays);
                    }}
                    style={{ padding: '0.2rem 0.4rem', background: c.days.includes(d) ? '#666' : t?.pageBg, color: c.days.includes(d) ? '#fff' : t?.pageText, border: `1px solid ${t?.border}`, cursor: 'pointer' }}
                  >
                    {dayChar}
                  </button>
                ))}
             </div>
             <button onClick={() => remove(i)} style={{ color: 'red', background: 'transparent', border: 'none', cursor: 'pointer' }}>Remove</button>
          </div>
        </div>
      ))}
      <button onClick={addConstraint} style={{ padding: '0.5rem', background: t?.subtleBg, border: `1px dashed ${t?.border}`, color: t?.pageText, cursor: 'pointer', width: '100%' }}>
        + Add Constraint
      </button>

      <NavButtons t={t} onBack={onBack} onNext={onNext} />
    </>
  );
}

export function StepFocusAxes({ t, draft, updateDraft, onBack, onNext }) {
  const focusAxes = draft.answers.focusAxes || [];

  const toggle = (key) => {
    if (focusAxes.includes(key)) {
      updateDraft('answers.focusAxes', focusAxes.filter(k => k !== key));
    } else {
      if (focusAxes.length >= 3) return; // limit to 3
      updateDraft('answers.focusAxes', [...focusAxes, key]);
    }
  };

  return (
    <>
      <Label t={t}>§ The Container</Label>
      <SectionTitle>Focus axes</SectionTitle>
      <Subtitle t={t}>
        Choose 1–3 focus axes. Elite at everything is not a plan. Discipline is derived from habit reliability across all domains, so it cannot be selected directly.
      </Subtitle>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {LIFE_DIMENSIONS.filter(d => d.key !== 'discipline').map(dim => {
          const isSelected = focusAxes.includes(dim.key);
          const isDisabled = !isSelected && focusAxes.length >= 3;
          return (
            <button
              key={dim.key}
              onClick={() => toggle(dim.key)}
              disabled={isDisabled}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '1rem',
                background: isSelected ? t?.subtleBg : 'transparent',
                border: `1px solid ${isSelected ? '#c4821a' : t?.border}`,
                color: t?.pageText,
                opacity: isDisabled ? 0.5 : 1,
                cursor: isDisabled ? 'default' : 'pointer',
                textAlign: 'left',
                borderRadius: '6px'
              }}
            >
              <span style={{ color: '#c4821a', fontSize: '1.2rem' }}>{dim.icon}</span>
              <span style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>{dim.label}</span>
            </button>
          );
        })}
      </div>
      
      <NavButtons t={t} onBack={onBack} onNext={onNext} canNext={focusAxes.length > 0} />
    </>
  );
}
