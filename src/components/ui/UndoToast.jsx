import React from 'react';
import { ArrowCounterClockwise } from '@phosphor-icons/react';

export function UndoToast({ message = 'Changes applied', onUndo, duration = 8000, onExpire }) {
  const [remaining, setRemaining] = React.useState(duration);
  React.useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      const next = Math.max(0, duration - (Date.now() - started));
      setRemaining(next);
      if (next === 0) { clearInterval(timer); onExpire?.(); }
    }, 100);
    return () => clearInterval(timer);
  }, [duration, onExpire]);
  const progress = duration > 0 ? remaining / duration : 0;
  return (
    <div className="ui-undo-toast" role="status" aria-live="polite">
      <span className="ui-undo-toast-message">{message}</span>
      <div aria-hidden="true" className="ui-undo-toast-ring" style={{ '--progress': progress }} />
      <button type="button" aria-label="Undo last action" className="ui-undo-toast-button" onClick={onUndo}>
        <ArrowCounterClockwise size={16} aria-hidden="true" /> Undo
      </button>
    </div>
  );
}
