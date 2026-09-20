import React from 'react';
import { Label, SectionTitle, Subtitle, NavButtons } from '../shared.jsx';

export function StepWelcome({ t, onNext }) {
  return (
    <>
      <Label t={t}>Actions</Label>
      <SectionTitle>Before we begin.</SectionTitle>
      <Subtitle t={t}>
        This isn't a productivity app. It's a record of who you are, where you are, and where you're going. Answer honestly — vague answers produce vague results.
      </Subtitle>
      <p style={{ color: t?.pageText, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
        Your stats = consistency (45%) + quest progress (40%) + momentum (15%). Scores start low by design — about 45 is a solid first month.
        Data stays on this device. Optional integrations and AI assist are opt-in.
      </p>
      <NavButtons t={t} onNext={onNext} nextLabel="Begin →" />
    </>
  );
}

export function StepBasics({ t, draft, updateDraft, onBack, onNext }) {
  const name = draft.answers.identity?.name || '';
  const weekStart = draft.answers.identity?.weekStart ?? 1;

  return (
    <>
      <Label t={t}>§ The Basics</Label>
      <SectionTitle>Who are you?</SectionTitle>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <Label t={t}>Your name</Label>
        <input
          value={name}
          onChange={e => updateDraft('answers.identity.name', e.target.value)}
          placeholder="What do you go by?"
          autoFocus
          style={{
            width: '100%', padding: '0.75rem',
            background: t?.subtleBg, border: `1px solid ${t?.border}`,
            color: t?.pageText, fontFamily: 'Georgia, serif', fontSize: '1rem',
            boxSizing: 'border-box', outline: 'none',
          }}
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <Label t={t}>Week starts on</Label>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input 
              type="radio" 
              name="weekStart" 
              checked={weekStart === 1}
              onChange={() => updateDraft('answers.identity.weekStart', 1)}
            />
            <span style={{ color: t?.pageText }}>Monday</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input 
              type="radio" 
              name="weekStart" 
              checked={weekStart === 0}
              onChange={() => updateDraft('answers.identity.weekStart', 0)}
            />
            <span style={{ color: t?.pageText }}>Sunday</span>
          </label>
        </div>
      </div>

      <NavButtons t={t} onBack={onBack} onNext={onNext} canNext={name.trim().length > 0} />
    </>
  );
}

export function StepAIAssist({ t, draft, updateDraft, onBack, onNext }) {
  const isEnabled = draft.settings?.aiAssistEnabled === true;

  const toggle = (val) => {
    updateDraft('settings.aiAssistEnabled', val);
  };

  return (
    <>
      <Label t={t}>§ AI Assist</Label>
      <SectionTitle>Guided Onboarding</SectionTitle>
      <Subtitle t={t}>
        You can answer the next sections by just talking, and the local AI will structure it for you. 
        It requires an API key in settings later, but you can opt in now.
      </Subtitle>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: isEnabled ? t?.subtleBg : 'transparent', border: `1px solid ${isEnabled ? '#c4821a' : t?.border}`, borderRadius: '6px', cursor: 'pointer' }}>
          <input 
            type="radio" 
            checked={isEnabled}
            onChange={() => toggle(true)}
          />
          <div>
            <div style={{ color: t?.pageText, fontWeight: 'bold' }}>Enable AI Assist</div>
            <div style={{ color: t?.muted, fontSize: '0.8rem' }}>I will type free text, you parse it.</div>
          </div>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: !isEnabled ? t?.subtleBg : 'transparent', border: `1px solid ${!isEnabled ? '#c4821a' : t?.border}`, borderRadius: '6px', cursor: 'pointer' }}>
          <input 
            type="radio" 
            checked={!isEnabled}
            onChange={() => toggle(false)}
          />
          <div>
            <div style={{ color: t?.pageText, fontWeight: 'bold' }}>Manual Entry (Default)</div>
            <div style={{ color: t?.muted, fontSize: '0.8rem' }}>I prefer filling out the structured forms myself.</div>
          </div>
        </label>
      </div>

      <NavButtons t={t} onBack={onBack} onNext={onNext} />
    </>
  );
}
