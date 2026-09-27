import React, { useMemo, useState } from 'react';
import { getOnboardingQuestion } from '../../core/onboarding/onboardingQuestions.js';
import { advanceOnboarding, activateOnboarding } from '../../core/onboarding/onboardingEngine.js';
import { getOnboardingState, saveOnboardingState } from '../../core/onboarding/onboardingPersistence.js';
import { onboardingProgress, STEP_LABELS } from '../../core/onboarding/onboardingState.js';
import { updateSelfModel } from '../../database/selfModelRepository.js';

export default function GuidedOnboardingFallback({ onComplete }) {
  const [state, setState] = useState(null);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    getOnboardingState().then(setState);
  }, []);

  const step = state?.step || 'intro';
  const question = getOnboardingQuestion(step);
  const progress = useMemo(() => onboardingProgress(state || { step }), [state]);
  const isConfirmation = step === 'confirmation';

  const submit = async () => {
    if (!answer.trim() && !isConfirmation) return;
    setSaving(true);
    try {
      if (isConfirmation) {
        const active = activateOnboarding({
          ...state,
          status: 'active',
          completedAt: new Date().toISOString(),
        });
        await updateSelfModel({
          onboarding: active,
          onboardingCompletedAt: new Date().toISOString(),
          onboardingVersion: 2,
          setupState: 'jarvis_design_pending',
          desiredSelf: {
            vision: state.answers.direction || '',
            dimensions: {},
          },
          identity: {
            oneLiner: state.answers.story || '',
            constraints: state.answers.constraints ? [state.answers.constraints] : [],
          },
        });
        await saveOnboardingState(active);
        onComplete?.();
        return;
      }

      const next = advanceOnboarding(state, { answer, step });
      await saveOnboardingState(next);
      setState(next);
      setAnswer('');
    } finally {
      setSaving(false);
    }
  };

  if (!state) {
    return <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: 'var(--mu)' }}>Preparing onboarding…</div>;
  }

  return (
    <div style={{ minHeight: '100dvh', padding: 'calc(28px + env(safe-area-inset-top, 0px)) 20px calc(28px + env(safe-area-inset-bottom, 0px))', background: 'var(--bg)', color: 'var(--tx)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 620, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mu)', font: "500 11px 'Geist Mono', monospace" }}>
          <span>Actions</span>
          <span>{Math.min(progress.currentIndex + 1, progress.total)} of {progress.total}</span>
        </div>
        <div style={{ height: 4, marginTop: 10, background: 'var(--s2)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: Math.max(4, progress.percent) + '%', height: '100%', background: 'var(--ac)' }} />
        </div>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '44px 0' }}>
          <div style={{ color: 'var(--ac)', font: "500 11px 'Geist Mono', monospace", textTransform: 'uppercase', letterSpacing: '.08em' }}>
            {STEP_LABELS[step]}
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 7vw, 42px)', lineHeight: 1.08, margin: '12px 0 10px', letterSpacing: '-.035em' }}>
            {question.title}
          </h1>
          <p style={{ color: 'var(--mu)', fontSize: 15, lineHeight: 1.55, margin: 0 }}>{question.prompt}</p>
          <p style={{ color: 'var(--mu)', fontSize: 12, marginTop: 10 }}>{question.hint}</p>

          {isConfirmation ? (
            <div style={{ marginTop: 22, padding: 16, border: '1px solid var(--hairline)', borderRadius: 16, background: 'var(--s1)', display: 'grid', gap: 10 }}>
              {Object.entries(state.answers).map(([key, value]) => (
                <div key={key}>
                  <div style={{ color: 'var(--mu)', fontSize: 11, textTransform: 'uppercase' }}>{STEP_LABELS[key] || key}</div>
                  <div style={{ marginTop: 3, fontSize: 14, lineHeight: 1.45 }}>{String(value)}</div>
                </div>
              ))}
            </div>
          ) : (
            <textarea
              value={answer}
              onChange={event => setAnswer(event.target.value)}
              placeholder="Type naturally…"
              autoFocus
              rows={5}
              style={{ width: '100%', boxSizing: 'border-box', marginTop: 22, padding: 14, resize: 'vertical', border: '1px solid var(--hairline)', borderRadius: 16, background: 'var(--s1)', color: 'var(--tx)', font: 'inherit', lineHeight: 1.5 }}
            />
          )}
        </main>

        <div>
          <button type="button" disabled={saving || (!answer.trim() && !isConfirmation)} onClick={submit} style={{ width: '100%', minHeight: 48, border: 0, borderRadius: 14, background: 'var(--ac)', color: 'var(--bg)', fontWeight: 650, cursor: 'pointer', opacity: saving ? .65 : 1 }}>
            {saving ? 'Saving…' : isConfirmation ? 'Confirm and continue' : 'Continue'}
          </button>
          <p style={{ textAlign: 'center', color: 'var(--mu)', fontSize: 11, marginTop: 10 }}>
            Your answers are saved locally. You can continue without AI.
          </p>
        </div>
      </div>
    </div>
  );
}
