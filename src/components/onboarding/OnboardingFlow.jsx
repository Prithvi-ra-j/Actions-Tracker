import React, { useState, useEffect } from 'react';
import { getDraft, saveDraft, clearDraft } from '../../core/onboarding/draft.js';
import { ProgressDots } from './shared.jsx';
import { buildCommitPlan } from '../../core/onboarding/plan.js';
import { commitOnboardingPlan } from '../../database/commit.js';

import { StepWelcome, StepBasics, StepAIAssist } from './steps/PhaseA.jsx';
import { StepIdentity, StepConstraints, StepFocusAxes } from './steps/PhaseB.jsx';
import { StepBaseline } from './steps/PhaseC.jsx';
import { StepVision, StepTargets } from './steps/PhaseD.jsx';

// Onboarding establishes direction and context only.
// Jarvis designs the execution system after onboarding from the user's answers
// and subsequent conversation/evidence.
const STEPS = [
  { id: 'A1', Component: StepWelcome },
  { id: 'A2', Component: StepBasics },
  { id: 'A3', Component: StepAIAssist },
  { id: 'B1', Component: StepIdentity },
  { id: 'B2', Component: StepConstraints },
  { id: 'B3', Component: StepFocusAxes },
  { id: 'C1', Component: StepBaseline },
  { id: 'D1', Component: StepVision },
  { id: 'D2', Component: StepTargets }
];

export default function OnboardingFlow({ t, onComplete }) {
  const [draft, setDraft] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDraft().then(d => {
      // Old in-progress drafts may point at removed quest/habit/budget steps.
      // Resume from the nearest valid step instead of reviving the old flow.
      const safeStep = Math.min(d.step || 0, STEPS.length - 1);
      const next = { ...d, step: safeStep };
      setDraft(next);
      setStepIndex(safeStep);
    });
  }, []);

  const updateDraft = (path, value) => {
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
    if (committing) return;

    const isLastStep = stepIndex === STEPS.length - 1;
    if (isLastStep) {
      setCommitting(true);
      setError(null);
      try {
        const plan = buildCommitPlan(draft, null);
        plan.selfModel.onboardingCompletedAt = new Date().toISOString();
        plan.selfModel.onboardingVersion = 4;
        await commitOnboardingPlan(plan);
        await clearDraft();
        if (onComplete) await onComplete();
      } catch (err) {
        console.error('[Onboarding] Direction commit failed:', err);
        setError(err.message || 'Could not save your starting point.');
        setCommitting(false);
      }
      return;
    }

    const nextIdx = Math.min(stepIndex + 1, STEPS.length - 1);
    const nextDraft = { ...draft, step: nextIdx };
    setDraft(nextDraft);
    setStepIndex(nextIdx);
    await saveDraft(nextDraft);
  };

  const handleBack = async () => {
    if (committing) return;
    const nextIdx = Math.max(stepIndex - 1, 0);
    const nextDraft = { ...draft, step: nextIdx };
    setDraft(nextDraft);
    setStepIndex(nextIdx);
    await saveDraft(nextDraft);
  };

  if (!draft) {
    return <div style={{ color: t?.pageText, padding: '2rem' }}>Loading onboarding state...</div>;
  }

  const CurrentStepComponent = STEPS[stepIndex].Component;
  const isLastStep = stepIndex === STEPS.length - 1;

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
          onBack={stepIndex > 0 ? handleBack : undefined}
          onNext={handleNext}
        />

        {isLastStep && committing && (
          <div style={{ marginTop: '1rem', color: t?.muted, fontSize: '0.8rem', textAlign: 'center' }}>
            Saving your direction…
          </div>
        )}

        {isLastStep && error && (
          <div style={{ marginTop: '1rem', color: '#b42318', fontSize: '0.8rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
