import React, { useState, useEffect } from 'react';
import { getDraft, saveDraft, clearDraft } from '../../core/onboarding/draft.js';
import { ProgressDots } from './shared.jsx';

import { StepWelcome, StepBasics, StepAIAssist } from './steps/PhaseA.jsx';
import { StepIdentity, StepConstraints, StepFocusAxes } from './steps/PhaseB.jsx';
import { StepBaseline, StepReveal } from './steps/PhaseC.jsx';
import { StepVision, StepTargets, StepQuests } from './steps/PhaseD.jsx';
import { StepHabits, StepBudget } from './steps/PhaseE.jsx';
import { StepReview, StepCommit, StepFirstAction } from './steps/PhaseG.jsx';

// Map steps exactly to our deterministic sequence
const STEPS = [
  { id: 'A1', Component: StepWelcome },
  { id: 'A2', Component: StepBasics },
  { id: 'A3', Component: StepAIAssist },
  { id: 'B1', Component: StepIdentity },
  { id: 'B2', Component: StepConstraints },
  { id: 'B3', Component: StepFocusAxes },
  { id: 'C1', Component: StepBaseline },
  { id: 'C2', Component: StepReveal },
  { id: 'D1', Component: StepVision },
  { id: 'D2', Component: StepTargets },
  { id: 'D3', Component: StepQuests },
  { id: 'E1', Component: StepHabits },
  { id: 'E2', Component: StepBudget },
  { id: 'G1', Component: StepReview },
  { id: 'G2', Component: StepCommit },
  { id: 'G3', Component: StepFirstAction }
];

export default function OnboardingFlow({ t, onComplete }) {
  const [draft, setDraft] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    getDraft().then(d => {
      setDraft(d);
      setStepIndex(d.step || 0);
    });
  }, []);

  const updateDraft = (path, value) => {
    // simple set via path string e.g. "answers.identity.name"
    const next = JSON.parse(JSON.stringify(draft));
    const parts = path.split('.');
    let cur = next;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
    
    setDraft(next);
    saveDraft(next).catch(err => console.error(err));
  };

  const handleNext = async () => {
    const nextIdx = Math.min(stepIndex + 1, STEPS.length - 1);
    const nextDraft = { ...draft, step: nextIdx };
    setDraft(nextDraft);
    setStepIndex(nextIdx);
    await saveDraft(nextDraft);
  };

  const handleBack = async () => {
    const nextIdx = Math.max(stepIndex - 1, 0);
    const nextDraft = { ...draft, step: nextIdx };
    setDraft(nextDraft);
    setStepIndex(nextIdx);
    await saveDraft(nextDraft);
  };

  const handleComplete = async () => {
    await clearDraft();
    if (onComplete) onComplete();
  };

  if (!draft) {
    return <div style={{ color: t?.pageText, padding: '2rem' }}>Loading onboarding state...</div>;
  }

  const CurrentStepComponent = STEPS[stepIndex].Component;

  const containerStyle = {
    background: t?.pageBg || '#f7f3ec',
    color: t?.pageText || '#1c1916',
    minHeight: '100dvh',
    padding: '2rem 1.5rem',
    maxWidth: 520,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2rem)',
    position: 'relative',
  };

  return (
    <div style={containerStyle}>
      <ProgressDots total={STEPS.length} current={stepIndex} t={t} />
      
      <div style={{ flex: 1 }}>
        <CurrentStepComponent 
          t={t} 
          draft={draft} 
          updateDraft={updateDraft} 
          onBack={stepIndex > 0 && stepIndex < STEPS.length - 2 ? handleBack : undefined} 
          onNext={handleNext}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
