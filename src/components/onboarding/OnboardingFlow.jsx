import React from 'react';
import JarvisTab from '../JarvisTab.jsx';

/**
 * Jarvis owns personal onboarding.
 *
 * There is intentionally no parallel form-based onboarding flow here. The
 * assistant interviews the user, structures the answers, proposes one
 * complete_onboarding action, and the user approves the write.
 */
export default function OnboardingFlow({ t, onComplete }) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: t?.pageBg,
      color: t?.pageText,
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <JarvisTab
        t={t}
        onboardingMode
        onOnboardingComplete={onComplete}
      />
    </div>
  );
}
