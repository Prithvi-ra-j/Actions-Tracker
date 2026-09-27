import React from 'react';
import JarvisTab from '../JarvisTab.jsx';
import GuidedOnboardingFallback from './GuidedOnboardingFallback.jsx';
import { hasJarvisApiKey } from '../../core/ai/jarvisConfig.js';

export default function OnboardingFlow({ t, onComplete }) {
  const [aiAvailable, setAiAvailable] = React.useState(null);

  React.useEffect(() => {
    hasJarvisApiKey().then(setAiAvailable).catch(() => setAiAvailable(false));
  }, []);

  if (aiAvailable === false) return <GuidedOnboardingFallback onComplete={onComplete} />;
  if (aiAvailable === null) return <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--bg)', color: 'var(--mu)' }}>Preparing onboarding…</div>;

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
