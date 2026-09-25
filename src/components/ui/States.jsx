import React from 'react';
import { Button } from './Buttons.jsx';

export function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="ui-state ui-state-empty" role="status">
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && onAction && <Button onClick={onAction} variant="secondary">{actionLabel}</Button>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="ui-state ui-state-error" role="alert">
      <p>{message}</p>
      {onRetry && <Button onClick={onRetry} variant="secondary">Retry</Button>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3, height = '56px' }) {
  return (
    <div className="ui-loading-skeleton" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ height }} className="ui-skeleton-row" />
      ))}
    </div>
  );
}
