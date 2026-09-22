import React from 'react';
import { Label, SectionTitle, Subtitle, NavButtons } from '../shared.jsx';
import { LIFE_DIMENSIONS } from '../../../constants.js';

export function StepBaseline({ t, draft, updateDraft, onBack, onNext }) {
  const focusAxes = draft.answers.focusAxes || [];
  const baseline = draft.answers.baseline || {};
  const update = (axis, field, val) => {
    updateDraft(`answers.baseline.${axis}`, {
      ...(baseline[axis] || {}),
      [field]: val
    });
  };

  const allAxes = [...focusAxes, 'discipline'];

  return (
    <>
      <Label t={t}>§ Where you are now</Label>
      <SectionTitle>Baseline</SectionTitle>
      <Subtitle t={t}>
        Tell us what has actually been happening. Do not plan your future schedule here. Jarvis will work that out with you later.
      </Subtitle>

      {allAxes.map(axis => {
        const dim = LIFE_DIMENSIONS.find(d => d.key === axis) || { key: axis, label: 'Discipline', icon: '⚡' };
        const b = baseline[axis] || {};

        if (axis === 'discipline') {
          return (
            <div key={axis} style={{ marginBottom: '1.5rem', padding: '1rem', background: t?.subtleBg, borderLeft: '3px solid #c4821a' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#c4821a', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
                {dim.icon} {dim.label.toUpperCase()}
              </div>
              <Label t={t}>Of the commitments you made recently, roughly what share did you keep?</Label>
              <input
                type="number"
                min="0"
                max="100"
                value={b.keptShare != null ? Math.round(b.keptShare * 100) : ''}
                onChange={e => update(axis, 'keptShare', Number(e.target.value) / 100)}
                style={{ width: '100%', padding: '0.55rem', background: t?.pageBg, color: t?.pageText, border: `1px solid ${t?.border}`, boxSizing: 'border-box' }}
              />
              <div style={{ color: t?.muted, fontSize: '0.75rem', marginTop: '0.5rem' }}>Optional. This is context, not a score target.</div>
            </div>
          );
        }

        return (
          <div key={axis} style={{ marginBottom: '1.5rem', padding: '1rem', background: t?.subtleBg, borderLeft: '3px solid #c4821a' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#c4821a', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
              {dim.icon} {dim.label.toUpperCase()}
            </div>
            <Label t={t}>Actual average per week</Label>
            <input
              type="number"
              min="0"
              max="21"
              value={b.ratePerWeek ?? ''}
              onChange={e => update(axis, 'ratePerWeek', Number(e.target.value))}
              style={{ width: '100%', padding: '0.55rem', background: t?.pageBg, color: t?.pageText, border: `1px solid ${t?.border}`, boxSizing: 'border-box' }}
            />
            <div style={{ color: t?.muted, fontSize: '0.75rem', marginTop: '0.5rem' }}>
              We only want the current reality here. No intended frequency.
            </div>
          </div>
        );
      })}

      <NavButtons t={t} onBack={onBack} onNext={onNext} canNext={true} />
    </>
  );
}
