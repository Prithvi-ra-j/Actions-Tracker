import React, { useEffect } from 'react';
import { ACCENT } from '../constants.js';

export default function CompletionFeedback({ feedback, onDismiss }) {
  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(onDismiss, 2200);
    return () => clearTimeout(timer);
  }, [feedback, onDismiss]);

  if (!feedback) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        right: '1.25rem',
        bottom: '1.25rem',
        zIndex: 9000,
        padding: '0.9rem 1.1rem',
        border: `1px solid ${ACCENT}`,
        background: '#1c1916',
        color: '#f7f3ec',
        boxShadow: '0 8px 24px rgba(0,0,0,0.24)',
        animation: 'completionFeedbackIn 180ms ease-out forwards',
      }}
    >
      <div style={{ fontFamily: 'monospace', fontSize: '0.62rem', color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        Vote cast
      </div>
      <div style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>{feedback.habitTitle}</div>
      <style>{`@keyframes completionFeedbackIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}