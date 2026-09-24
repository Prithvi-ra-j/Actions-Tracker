import React from 'react';
import { Button } from './Buttons.jsx';

export function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '48px 24px',
      color: 'var(--mu)'
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--tx)', marginBottom: '8px', margin: 0 }}>
        {title}
      </h3>
      <p style={{ fontSize: '14.5px', marginBottom: '24px', marginTop: 0, lineHeight: 1.5 }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="secondary">
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
