import React, { useState, useEffect } from 'react';
import { Label, SectionTitle, Subtitle, NavButtons } from '../shared.jsx';
import { buildCommitPlan } from '../../../core/onboarding/plan.js';
import { commitOnboardingPlan } from '../../../database/commit.js';

export function StepReview({ t, draft, onBack, onNext }) {
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    // We run buildCommitPlan purely to get the findings.
    // In production we would pass existing selfModel if mode='recalibrate'
    setPlan(buildCommitPlan(draft, null));
  }, [draft]);

  if (!plan) return <div>Loading...</div>;

  const blocks = plan.findings.filter(f => f.severity === 'block');
  const warns = plan.findings.filter(f => f.severity === 'warn');

  return (
    <>
      <Label t={t}>§ Review</Label>
      <SectionTitle>Pre-Flight Checks</SectionTitle>
      <Subtitle t={t}>
        Checking for contradictions and missing pieces.
      </Subtitle>

      {blocks.length === 0 && warns.length === 0 && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#e6ffe6', color: '#006600' }}>
          All checks passed. System is ready to commit.
        </div>
      )}

      {blocks.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ color: 'red', margin: '0 0 0.5rem 0' }}>Blocks (must fix before Next)</h4>
          {blocks.map((b, i) => (
            <div key={i} style={{ padding: '0.5rem', background: '#ffe6e6', color: 'red', borderLeft: '3px solid red', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              {b.id}: {b.message}
            </div>
          ))}
        </div>
      )}

      {warns.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ color: '#c4821a', margin: '0 0 0.5rem 0' }}>Warnings (can proceed)</h4>
          {warns.map((w, i) => (
            <div key={i} style={{ padding: '0.5rem', background: '#fff2e6', color: '#cc5500', borderLeft: '3px solid #c4821a', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              {w.id}: {w.message}
            </div>
          ))}
        </div>
      )}

      <NavButtons t={t} onBack={onBack} onNext={onNext} canNext={blocks.length === 0} />
    </>
  );
}

export function StepCommit({ t, draft, onNext, onComplete }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const handleCommit = async () => {
    setStatus('saving');
    setError(null);
    try {
      const plan = buildCommitPlan(draft, null);
      
      // Persist completion where the app's onboarding gate reads it.
      const completedAt = new Date().toISOString();
      plan.selfModel.onboardingCompletedAt = completedAt;
      plan.selfModel.onboardingVersion = 3;

      await commitOnboardingPlan(plan);
      setStatus('success');
      
      // Delay so they see success before jumping to G3
      setTimeout(() => {
        onNext();
      }, 1500);

    } catch (err) {
      console.error('[Onboarding] Commit failed:', err);
      setStatus('error');
      setError(err.message);
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
      <Label t={t}>§ Finalize</Label>
      <SectionTitle>Commit the System</SectionTitle>
      
      <div style={{ margin: '2rem 0' }}>
        {status === 'idle' && (
          <button 
            onClick={handleCommit}
            style={{ padding: '1rem 2rem', fontSize: '1rem', background: '#c4821a', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
          >
            Build System
          </button>
        )}
        
        {status === 'saving' && (
           <div style={{ fontFamily: 'monospace', color: t?.muted }}>Writing to local database...</div>
        )}
        
        {status === 'success' && (
           <div style={{ fontFamily: 'monospace', color: '#006600', fontWeight: 'bold' }}>Success! Moving to First Action...</div>
        )}
        
        {status === 'error' && (
          <div style={{ color: 'red' }}>
             <p>Commit failed: {error}</p>
             <button 
                onClick={handleCommit}
                style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid red', color: 'red', cursor: 'pointer', marginTop: '1rem' }}
             >
                Retry
             </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function StepFirstAction({ t, onComplete }) {
  return (
    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
      <Label t={t}>§ Day 0</Label>
      <SectionTitle>First Action</SectionTitle>
      <Subtitle t={t}>
        Your system is built. But a system without evidence is just a wish.
      </Subtitle>
      
      <p style={{ color: t?.pageText, fontSize: '1rem', margin: '2rem 0' }}>
        Do one rep of one habit right now.
      </p>

      <button 
        onClick={onComplete}
        style={{ padding: '1rem 2rem', fontSize: '1rem', background: '#c4821a', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
      >
        Go to Today Screen →
      </button>
    </div>
  );
}
