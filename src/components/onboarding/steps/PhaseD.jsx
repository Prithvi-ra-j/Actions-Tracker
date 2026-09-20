import React from 'react';
import { Label, SectionTitle, Subtitle, NavButtons, SliderRow } from '../shared.jsx';
import { LIFE_DIMENSIONS } from '../../../constants.js';
import { maxReachable, projectStat, noQuestCeiling, monthsToTarget } from '../../../core/onboarding/calibration.js';
import { getWeights } from '../../../helpers/statsEngine.js';
import { personalProgramPack } from '../../../data/starterPack.js';

export function StepVision({ t, draft, updateDraft, onBack, onNext }) {
  const vision = draft.answers.desiredSelf?.vision || '';

  return (
    <>
      <Label t={t}>§ Where you want to go</Label>
      <SectionTitle>Desired Self</SectionTitle>
      <Subtitle t={t}>
        Be ambitious but honest. "I want to be elite at everything" is not a plan — it's avoidance of prioritisation.
      </Subtitle>

      <div style={{ marginBottom: '1.5rem' }}>
        <Label t={t}>In 1–3 years, who are you?</Label>
        <textarea
          value={vision}
          onChange={e => updateDraft('answers.desiredSelf.vision', e.target.value)}
          placeholder='e.g. "A man who trains seriously, reads widely, and makes things."'
          rows={3}
          style={{
            width: '100%', padding: '0.75rem',
            background: t?.subtleBg, border: `1px solid ${t?.border}`,
            color: t?.pageText, fontFamily: 'Georgia, serif', fontSize: '0.9rem',
            boxSizing: 'border-box', outline: 'none', resize: 'vertical',
          }}
        />
      </div>

      <NavButtons t={t} onBack={onBack} onNext={onNext} canNext={vision.trim().length > 0} />
    </>
  );
}

export function StepTargets({ t, draft, updateDraft, onBack, onNext }) {
  const focusAxes = draft.answers.focusAxes || [];
  const dimensions = draft.answers.desiredSelf?.dimensions || {};

  const update = (axis, field, val) => {
    updateDraft(`answers.desiredSelf.dimensions.${axis}`, {
      ...(dimensions[axis] || { targetValue: 50, why: '', timeframe: '1y' }),
      [field]: val
    });
  };

  return (
    <>
      <Label t={t}>§ Where you want to go</Label>
      <SectionTitle>Targets</SectionTitle>
      <Subtitle t={t}>
        Set your targets on the calibrated scale. The slider maximum is the highest you can reach with standard weights.
      </Subtitle>

      {focusAxes.map(axis => {
        const dim = LIFE_DIMENSIONS.find(d => d.key === axis);
        const d = dimensions[axis] || { targetValue: 50, why: '', timeframe: '1y' };
        const maxR = maxReachable('building');
        
        // Live feasibility
        const mockQuests = (draft.answers.quests || []).filter(q => q.axis === axis);
        const w = getWeights([]); // default building weights
        const mToTarget = monthsToTarget({ axis, expectedPerWeek: 7, quests: mockQuests, weights: w }, d.targetValue);

        return (
          <div key={axis} style={{ marginBottom: '1.5rem', padding: '1rem', background: t?.subtleBg, borderLeft: `3px solid #c4821a` }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#c4821a', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
              {dim.icon} {dim.label.toUpperCase()}
            </div>
            
            <SliderRow
              t={t} label="Target level"
              icon="▸" value={d.targetValue} min={0} max={maxR} step={5}
              onChange={v => update(axis, 'targetValue', v)}
            />
            
            {mToTarget && (
              <p style={{ color: t?.muted, fontSize: '0.75rem', marginBottom: '1rem' }}>
                Even with perfect adherence, ~{mToTarget} months to reach {d.targetValue}.
              </p>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <Label t={t}>Timeframe</Label>
                <select 
                  value={d.timeframe} 
                  onChange={e => update(axis, 'timeframe', e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', background: t?.pageBg, color: t?.pageText, border: `1px solid ${t?.border}` }}
                >
                  <option value="3m">3 months</option>
                  <option value="6m">6 months</option>
                  <option value="1y">1 year</option>
                  <option value="2y">2 years</option>
                  <option value="3y">3 years</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <Label t={t}>Why?</Label>
              <input
                value={d.why}
                onChange={e => update(axis, 'why', e.target.value)}
                placeholder='The real reason, not the socially acceptable one'
                style={{
                  width: '100%', padding: '0.55rem 0.75rem',
                  background: t?.pageBg, border: `1px solid ${t?.border}`,
                  color: t?.pageText, fontFamily: 'Georgia, serif', fontSize: '0.85rem',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>
          </div>
        );
      })}

      <NavButtons t={t} onBack={onBack} onNext={onNext} />
    </>
  );
}

export function StepQuests({ t, draft, updateDraft, onBack, onNext }) {
  const focusAxes = draft.answers.focusAxes || [];
  const quests = draft.answers.quests || [];
  const w = getWeights([]);

  const addQuest = (axis, template) => {
    updateDraft('answers.quests', [...quests, { ...template, axis }]);
  };

  const removeQuest = (idx) => {
    const next = [...quests];
    next.splice(idx, 1);
    updateDraft('answers.quests', next);
  };

  return (
    <>
      <Label t={t}>§ Action</Label>
      <SectionTitle>Quests</SectionTitle>
      <Subtitle t={t}>
        Quests drive your Volume score. Pick 1–3 yearly quests for each focus axis.
      </Subtitle>

      {focusAxes.map(axis => {
        const dim = LIFE_DIMENSIONS.find(d => d.key === axis);
        const axisQuests = quests.filter(q => q.axis === axis);
        
        // Live ceiling preview
        const perfectMonth = Math.round(projectStat({ axis, weeks: 4, expectedPerWeek: 7, quests: axisQuests, weights: w }));
        const perfectQuarter = Math.round(projectStat({ axis, weeks: 13, expectedPerWeek: 7, quests: axisQuests, weights: w }));
        const perfectYear = Math.round(projectStat({ axis, weeks: 52, expectedPerWeek: 7, quests: axisQuests, weights: w }));
        const emptyCeiling = Math.round(noQuestCeiling(w));

        return (
          <div key={axis} style={{ marginBottom: '1.5rem', padding: '1rem', background: t?.subtleBg, borderLeft: `3px solid #c4821a` }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#c4821a', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
              {dim.icon} {dim.label.toUpperCase()}
            </div>
            
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: t?.pageBg, border: `1px solid ${t?.borderFaint}` }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: t?.muted }}>
                No quests → you cap at ~{emptyCeiling}. With these quests: 
                a perfect month ≈ {perfectMonth}, quarter ≈ {perfectQuarter}, year ≈ {perfectYear}.
              </p>
            </div>

            {quests.map((q, i) => {
              if (q.axis !== axis) return null;
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', padding: '0.5rem', background: t?.pageBg, border: `1px solid ${t?.border}` }}>
                  <div style={{ fontSize: '0.85rem', color: t?.pageText }}>
                    <strong>{q.title}</strong> — {q.targetValue} {q.unit}
                  </div>
                  <button onClick={() => removeQuest(i)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                </div>
              );
            })}

            <div style={{ marginTop: '1rem' }}>
              <Label t={t}>Add from Starter Pack</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(personalProgramPack.quests.filter(q => q.metric.axis === axis || q.axis === axis)).map((template, i) => (
                  <button
                    key={i}
                    onClick={() => addQuest(axis, template)}
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', background: t?.subtleBg, border: `1px solid ${t?.border}`, color: t?.pageText, cursor: 'pointer' }}
                  >
                    + {template.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <NavButtons t={t} onBack={onBack} onNext={onNext} />
    </>
  );
}
