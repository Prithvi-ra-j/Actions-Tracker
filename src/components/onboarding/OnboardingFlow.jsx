import React, { useState } from 'react';
import JarvisTab from '../JarvisTab.jsx';
import { markOnboardingComplete } from '../../database/selfModelRepository.js';
import { Button } from '../ui/Buttons.jsx';

export default function OnboardingFlow({ t, onComplete }) {
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState('');

  return (
    <div
      aria-label="First-run onboarding"
      style={{
        width: '100%',
        height: '100dvh',
        minHeight: '100dvh',
        overflowX: 'hidden',
        overflowY: 'auto',
        background: 'var(--bg)',
        color: 'var(--tx)',
      }}
    >
      <div style={{ padding: 'calc(12px + env(safe-area-inset-top, 0px)) 18px 0' }}>
        <h1 style={{ fontSize: '24px', margin: '12px 0 8px' }}>Make a little progress, your way.</h1>
        <p style={{ color: 'var(--mu)', lineHeight: 1.5, margin: '0 0 16px' }}>
          Track habits, goals and learning without AI. Ved is an optional AI assistant prototype you can connect now or later.
        </p>
        {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
        <Button
          variant="primary"
          disabled={skipping}
          onClick={async () => {
            setSkipping(true);
            setError('');
            try {
              await markOnboardingComplete();
              await onComplete({ startInToday: true });
            } catch (err) {
              console.error('[Onboarding] Could not continue without Ved:', err);
              setError('Could not save your setup. Please try again.');
              setSkipping(false);
            }
          }}
        >
          Continue without Ved
        </Button>
      </div>
      <JarvisTab
        t={t}
        onboardingMode
        onOnboardingComplete={onComplete}
      />
    </div>
  );
}
