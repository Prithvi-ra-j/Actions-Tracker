import React from 'react';
import { Label, SectionTitle, Subtitle, NavButtons } from '../shared.jsx';
import { LIFE_DIMENSIONS } from '../../../constants.js';
import { priorFromBaseline } from '../../../core/onboarding/calibration.js';
import { getThresholdTitle } from '../../../helpers/statsEngine.js';

export function StepBaseline({ t, draft, updateDraft, onBack, onNext }) {
  const focusAxes = draft.answers.focusAxes || [];
  const baseline = draft.answers.baseline || {};

  const update = (axis, field, val) => {
    updateDraft(`answers.baseline.${axis}`, {
      ...(baseline[axis] || {}),
      [field]: val
    });
  };

  const allAxes = [...focusAxes, 'discipline']; // Add discipline for the cross-cutting question

  return (
    <>
      <Label t={t}>§ Where you are now</Label>
      <SectionTitle>Baseline</SectionTitle>
      <Subtitle t={t}>
        Numbers only. How many times per week did you actually do this over the last 4 weeks?
      </Subtitle>

      {allAxes.map(axis => {
        const dim = LIFE_DIMENSIONS.find(d => d.key === axis) || { key: axis, label: 'Discipline', icon: '⚡' };
        const b = baseline[axis] || {};
        
        if (axis === 'discipline') {
          return (
            <div key={axis} style={{ marginBottom: '1.5rem', padding: '1rem', background: t?.subtleBg, borderLeft: `3px solid #c4821a` }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#c4821a', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
                {dim.icon} {dim.label.toUpperCase()}
              </div>
              <Label t={t}>Of the commitments you made in the last 4 weeks, what share did you keep? (0-100%)</Label>
              <input 
                type="number" min="0" max="100" 
                value={b.keptShare ? Math.round(b.keptShare * 100) : ''}
                onChange={e => update(axis, 'keptShare', Number(e.target.value) / 100)}
                style={{ width: '100px', padding: '0.4rem', background: t?.pageBg, color: t?.pageText, border: `1px solid ${t?.border}` }}
              /> %
            </div>
          );
        }

        return (
          <div key={axis} style={{ marginBottom: '1.5rem', padding: '1rem', background: t?.subtleBg, borderLeft: `3px solid #c4821a` }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#c4821a', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
              {dim.icon} {dim.label.toUpperCase()}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <Label t={t}>Actual average / wk</Label>
                <input 
                  type="number" min="0" max="21"
                  value={b.ratePerWeek ?? ''}
                  onChange={e => update(axis, 'ratePerWeek', Number(e.target.value))}
                  style={{ width: '100%', padding: '0.4rem', background: t?.pageBg, color: t?.pageText, border: `1px solid ${t?.border}` }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Label t={t}>Intended / wk</Label>
                <input 
                  type="number" min="1" max="21"
                  value={b.intendedPerWeek ?? ''}
                  onChange={e => update(axis, 'intendedPerWeek', Number(e.target.value))}
                  style={{ width: '100%', padding: '0.4rem', background: t?.pageBg, color: t?.pageText, border: `1px solid ${t?.border}` }}
                />
              </div>
            </div>
          </div>
        );
      })}

      <NavButtons t={t} onBack={onBack} onNext={onNext} canNext={true} />
    </>
  );
}

export function StepReveal({ t, draft, updateDraft, onBack, onNext }) {
  const focusAxes = draft.answers.focusAxes || [];
  const baseline = draft.answers.baseline || {};

  return (
    <>
      <Label t={t}>§ The Result</Label>
      <SectionTitle>Computed Baseline</SectionTitle>
      <Subtitle t={t}>
        This is your starting line. It is computed purely from your behavior over the last month.
      </Subtitle>

      {focusAxes.map(axis => {
        const dim = LIFE_DIMENSIONS.find(d => d.key === axis);
        const b = baseline[axis] || {};
        
        const prior = Math.round(priorFromBaseline({
          axis,
          ratePerWeek: b.ratePerWeek || 0,
          intendedPerWeek: b.intendedPerWeek || 1,
          hasConsistencyTerm: axis !== 'social',
          retroV: 0
        }));

        const title = getThresholdTitle(axis, prior);

        return (
          <div key={axis} style={{ marginBottom: '1.5rem', padding: '1rem', background: t?.subtleBg, borderLeft: `3px solid #c4821a` }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#c4821a', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
              {dim.icon} {dim.label.toUpperCase()}
            </div>
            
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: t?.pageText }}>
              {prior} <span style={{ fontSize: '1rem', color: t?.muted, fontWeight: 'normal' }}>/ 99 — {title}</span>
            </div>
            <p style={{ color: t?.muted, fontSize: '0.8rem', marginTop: '0.5rem' }}>
              Because you did {b.ratePerWeek || 0} of your {b.intendedPerWeek || 1} intended sessions.
            </p>
          </div>
        );
      })}

      <NavButtons t={t} onBack={onBack} onNext={onNext} />
    </>
  );
}
