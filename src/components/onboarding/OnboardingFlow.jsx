import React from 'react';
import JarvisTab from '../JarvisTab.jsx';

export default function OnboardingFlow({ t, onComplete }) {
  return (
    <div
      aria-label="First-run onboarding"
      style={{
        width: '100%',
        height: '100dvh',
        minHeight: '100dvh',
        overflow: 'hidden',
        background: 'var(--bg)',
        color: 'var(--tx)',
      }}
    >
      <JarvisTab
        t={t}
        onboardingMode
        onOnboardingComplete={onComplete}
      />
    </div>
  );
}
