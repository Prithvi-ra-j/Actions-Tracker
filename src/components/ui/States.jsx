import React from 'react';
import { Button } from './Buttons.jsx';

export function EmptyState({ title, description, actionLabel, onAction, actionVariant = 'secondary', eyebrow, example }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: eyebrow ? 'flex-start' : 'center',
      textAlign: eyebrow ? 'left' : 'center',
      padding: eyebrow ? '30px 22px 24px' : '48px 24px',
      background: eyebrow ? 'var(--s1)' : undefined,
      border: eyebrow ? '1px solid var(--hairline)' : undefined,
      borderRadius: eyebrow ? 'var(--r-container)' : undefined,
      color: 'var(--mu)'
    }}>
      {eyebrow && <span className="empty-state-eyebrow">{eyebrow}</span>}
      <h3 style={{ fontSize: eyebrow ? '22px' : '18px', letterSpacing: eyebrow ? '-0.03em' : undefined, lineHeight: 1.2, fontWeight: 600, color: 'var(--tx)', margin: '0 0 8px' }}>
        {title}
      </h3>
      <p style={{ fontSize: '14.5px', margin: example ? '0 0 16px' : '0 0 24px', lineHeight: 1.55, maxWidth: '40ch' }}>
        {description}
      </p>
      {example && <p className="empty-state-example">{example}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant={actionVariant}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '24px',
      backgroundColor: 'var(--s1)',
      borderRadius: 'var(--r-container)',
      border: '1px solid var(--danger)'
    }}>
      <p style={{ fontSize: '14.5px', color: 'var(--danger)', marginBottom: '16px', marginTop: 0 }}>
        {message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary">
          Retry
        </Button>
      )}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3, height = '56px' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height,
            backgroundColor: 'var(--s2)',
            borderRadius: 'var(--r-control)',
            opacity: 1 - (i * 0.2), // fading out effect
            animation: 'pulse 1.5s infinite ease-in-out'
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 0.8; }
          100% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
