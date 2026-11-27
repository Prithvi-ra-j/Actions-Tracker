import React, { useRef, useState } from 'react';
import { attributeLabel } from '../../constants.js';
import { GROWTH_ATTRIBUTES, HABIT_TEMPLATES } from '../../data/habitTemplates.js';
import { createHabitRecord } from '../../database/habitRepository.js';
import { commitOnboardingPlan } from '../../database/commit.js';
import { getSelfModel } from '../../database/selfModelRepository.js';
import { Button } from '../ui/Buttons.jsx';

const cardStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  padding: '12px',
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--r-control)',
  background: 'var(--s1)',
};

export default function OnboardingFlow({ onComplete }) {
  const [step, setStep] = useState(0);
  const [attributes, setAttributes] = useState(['body']);
  const [selected, setSelected] = useState([]);
  const [custom, setCustom] = useState('');
  const [customDomain, setCustomDomain] = useState('body');
  const [timeSlot, setTimeSlot] = useState('morning');
  const [reminderTime, setReminderTime] = useState('08:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const committed = useRef(false);

  const templates = HABIT_TEMPLATES.filter(template => attributes.includes(template.domain));
  const toggleAttribute = key => setAttributes(current =>
    current.includes(key) ? current.filter(item => item !== key) : [...current, key]
  );
  const toggleTemplate = id => setSelected(current =>
    current.includes(id) ? current.filter(item => item !== id) : [...current, id]
  );

  async function finish() {
    setSaving(true);
    setError('');
    try {
      const choices = templates.filter(template => selected.includes(template.id));
      if (custom.trim()) {
        choices.push({ name: custom.trim(), domain: attributes.includes(customDomain) ? customDomain : attributes[0], tiny: '' });
      }
      if (!choices.length) {
        setError('Choose or add at least one habit.');
        setSaving(false);
        return;
      }
      if (!committed.current) {
        const selfModel = await getSelfModel();
        const habits = choices.map(choice => createHabitRecord({
          name: choice.name,
          domain: choice.domain,
          frequency: { type: 'daily' },
          tinyVersion: choice.tiny,
          implementationIntention: { anchor: '', behavior: '', location: '', timeSlot },
        }));
        await commitOnboardingPlan({
          habits,
          selfModel: { ...selfModel, onboardingCompletedAt: new Date().toISOString(), onboardingVersion: 2 },
          settings: {
            reminders: JSON.stringify([{ id: 4, label: 'DAILY REMINDER', time: reminderTime, enabled: false }]),
            firstHabitReminderPrompt: 'pending',
          },
        });
        committed.current = true;
      }
      await onComplete({ startInToday: true });
    } catch (err) {
      console.error('[Onboarding] Could not save setup:', err);
      setError(committed.current ? 'Your plan was saved, but Today could not open. Try again.' : 'Could not save your plan. Please try again.');
      setSaving(false);
    }
  }

  return (
    <main aria-label="First-run onboarding" style={{
      width: '100%', minHeight: '100dvh', overflowY: 'auto', background: 'var(--bg)', color: 'var(--tx)',
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: 'calc(20px + env(safe-area-inset-top, 0px)) 18px 32px' }}>
        {step === 0 && (
          <>
            <h1>Become who you want to be.</h1>
            <p>Turn intentions into visible evidence of growth.</p>
            <p>Your first week is about learning your normal. Start small, at your own pace.</p>
            <Button variant="primary" onClick={() => setStep(1)}>Get started</Button>
          </>
        )}
        {step === 1 && (
          <>
            <h1>What do you want to grow?</h1>
            <p>Choose any. Discipline is what helps you keep going, including when you rest.</p>
            <div style={{ display: 'grid', gap: '8px' }}>
              {GROWTH_ATTRIBUTES.map(attribute => (
                <label key={attribute.key} style={cardStyle}>
                  <input type="checkbox" checked={attributes.includes(attribute.key)} onChange={() => toggleAttribute(attribute.key)} />
                  <span><strong>{attributeLabel(attribute.key)}</strong><br />{attribute.description}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={() => setAttributes(GROWTH_ATTRIBUTES.map(attribute => attribute.key))}>I want all five</Button>
              <Button variant="primary" disabled={!attributes.length} onClick={() => {
                const firstForEach = attributes.map(key => HABIT_TEMPLATES.find(template => template.domain === key));
                const defaults = firstForEach.length > 1
                  ? firstForEach.slice(0, 3)
                  : HABIT_TEMPLATES.filter(template => template.domain === attributes[0]).slice(0, 2);
                setSelected(defaults.map(template => template.id));
                setStep(2);
              }}>Continue</Button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1>Choose a few small habits</h1>
            <p>Start with what feels manageable. You can add your own, too.</p>
            <div style={{ display: 'grid', gap: '8px' }}>
              {templates.map(template => (
                <label key={template.id} style={cardStyle}>
                  <input type="checkbox" checked={selected.includes(template.id)} onChange={() => toggleTemplate(template.id)} />
                  <span><strong>{template.name}</strong><br /><small>{attributeLabel(template.domain)} · Tiny version: {template.tiny}</small></span>
                </label>
              ))}
            </div>
            <label style={{ display: 'grid', gap: '6px', margin: '16px 0' }}>
              Add your own habit (optional)
              <input value={custom} onChange={event => setCustom(event.target.value)} maxLength={120} />
            </label>
            {custom.trim() && attributes.length > 1 && (
              <label style={{ display: 'grid', gap: '6px', marginBottom: '16px' }}>
                Your habit's area
                <select value={attributes.includes(customDomain) ? customDomain : attributes[0]} onChange={event => setCustomDomain(event.target.value)}>
                  {attributes.map(key => <option key={key} value={key}>{attributeLabel(key)}</option>)}
                </select>
              </label>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button variant="primary" disabled={!selected.length && !custom.trim()} onClick={() => setStep(3)}>Continue</Button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h1>When works for you?</h1>
            <label style={{ display: 'grid', gap: '6px', marginBottom: '16px' }}>
              Time of day
              <select value={timeSlot} onChange={event => setTimeSlot(event.target.value)}>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: '6px', marginBottom: '16px' }}>
              Reminder time
              <input type="time" required value={reminderTime} onChange={event => setReminderTime(event.target.value)} />
            </label>
            <p>We'll ask before enabling reminders after your first check-off.</p>
            {error && <p role="alert">{error}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" disabled={saving || committed.current} onClick={() => setStep(2)}>Back</Button>
              <Button variant="primary" disabled={saving || !reminderTime} onClick={finish}>{saving ? 'Saving...' : 'Go to Today'}</Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
