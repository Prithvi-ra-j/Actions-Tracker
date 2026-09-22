import React from 'react';
import { Label, SectionTitle, Subtitle, NavButtons, SliderRow } from '../shared.jsx';
import { LIFE_DIMENSIONS } from '../../../constants.js';

const DOMAIN_PROMPTS = {
  body: 'What would being meaningfully better physically look like for you?',
  social: 'What would a better social life or stronger relationships look like for you?',
  strategy: 'What would better decisions, planning, or judgment look like for you?',
  knowledge: 'What would you genuinely like to understand or become knowledgeable about?',
  creativity: 'What would you like to create, practice, or become capable of?',
  discipline: 'What kind of reliability or self-command do you want to develop?',
};

export function StepVision({ t, draft, updateDraft, onBack, onNext }) {
  const vision = draft.answers.desiredSelf?.vision || '';

  return (
    <>
      <Label t={t}>§ Where you want to go</Label>
      <SectionTitle>Desired Self</SectionTitle>
      <Subtitle t={t}>
        Describe the person you are trying to become. Jarvis will turn this into an executable system later.
      </Subtitle>

      <div style={{ marginBottom: '1.5rem' }}>
        <Label t={t}>In 1–3 years, who are you?</Label>
        <textarea
          value={vision}
          onChange={e => updateDraft('answers.desiredSelf.vision', e.target.value)}
          placeholder='e.g. "A man who is athletic, dependable, curious, socially connected, and capable of making good decisions."'
          rows={4}
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
      ...(dimensions[axis] || { targetValue: 50, why: '', timeframe: '1y', successDefinition: '' }),
      [field]: val
    });
  };

  return (
    <>
      <Label t={t}>§ Direction</Label>
      <SectionTitle>Targets</SectionTitle>
      <Subtitle t={t}>
        Define what you want. Do not design habits, quests, schedules, or tracking methods yet. Jarvis will ask questions and build those with you after onboarding.
      </Subtitle>

      {focusAxes.map(axis => {
        const dim = LIFE_DIMENSIONS.find(d => d.key === axis);
        const d = dimensions[axis] || { targetValue: 50, why: '', timeframe: '1y', successDefinition: '' };

        return (
          <div key={axis} style={{ marginBottom: '1.5rem', padding: '1rem', background: t?.subtleBg, borderLeft: '3px solid #c4821a' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#c4821a', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
              {dim.icon} {dim.label.toUpperCase()}
            </div>

            <div style={{ color: t?.muted, fontSize: '0.78rem', lineHeight: 1.5, marginBottom: '0.9rem' }}>
              {DOMAIN_PROMPTS[axis] || 'What would meaningful progress look like for you?'}
            </div>

            <Label t={t}>What would success look like?</Label>
            <textarea
              value={d.successDefinition}
              onChange={e => update(axis, 'successDefinition', e.target.value)}
              placeholder='Describe the outcome in your own words. It can be qualitative.'
              rows={3}
              style={{
                width: '100%', padding: '0.65rem',
                background: t?.pageBg, border: `1px solid ${t?.border}`,
                color: t?.pageText, fontFamily: 'Georgia, serif', fontSize: '0.85rem',
                boxSizing: 'border-box', outline: 'none', resize: 'vertical',
              }}
            />

            <div style={{ marginTop: '1rem' }}>
              <Label t={t}>Direction on the 0–99 scale (optional)</Label>
              <SliderRow
                t={t}
                label="Desired level"
                icon="▸"
                value={d.targetValue}
                min={0}
                max={99}
                step={1}
                onChange={v => update(axis, 'targetValue', v)}
              />
              <div style={{ color: t?.muted, fontSize: '0.72rem', marginTop: '0.35rem' }}>
                This is only a directional reference. Jarvis will decide later whether this domain should use numbers, reflections, milestones, performance evidence, or a mixture.
              </div>
            </div>

            <div style={{ marginTop: '0.9rem' }}>
              <Label t={t}>Why does this matter?</Label>
              <input
                value={d.why}
                onChange={e => update(axis, 'why', e.target.value)}
                placeholder='Your reason'
                style={{
                  width: '100%', padding: '0.55rem 0.75rem',
                  background: t?.pageBg, border: `1px solid ${t?.border}`,
                  color: t?.pageText, fontFamily: 'Georgia, serif', fontSize: '0.85rem',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>

            <div style={{ marginTop: '0.9rem' }}>
              <Label t={t}>Time horizon</Label>
              <select
                value={d.timeframe}
                onChange={e => update(axis, 'timeframe', e.target.value)}
                style={{ width: '100%', padding: '0.55rem', background: t?.pageBg, color: t?.pageText, border: `1px solid ${t?.border}` }}
              >
                <option value="3m">3 months</option>
                <option value="6m">6 months</option>
                <option value="1y">1 year</option>
                <option value="2y">2 years</option>
                <option value="3y">3 years</option>
              </select>
            </div>
          </div>
        );
      })}

      <NavButtons t={t} onBack={onBack} onNext={onNext} />
    </>
  );
}
