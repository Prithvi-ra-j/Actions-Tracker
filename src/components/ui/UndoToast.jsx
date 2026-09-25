import React, { useEffect, useState } from 'react';
import { ArrowCounterClockwise } from '@phosphor-icons/react';

export function UndoToast({ message = 'Changes applied', onUndo, duration = 8000, onExpire }) {
  const [remaining, setRemaining] = useState(duration);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      const next = Math.max(0, duration - (Date.now() - started));
      setRemaining(next);
      if (next === 0) { clearInterval(timer); onExpire?.(); }
    }, 100);
    return () => clearInterval(timer);
  }, [duration, onExpire]);

  return (
    <div role="status" aria-live="polite" style={{
      position: 'absolute', left: '14px', right: '14px', bottom: '78px', zIndex: 30,
      display: 'flex', alignItems: 'center', gap: '10px', minHeight: '52px',
      padding: '0 6px 0 14px', borderRadius: '12px', background: 'var(--s2)',
      boxShadow: 'inset 0 0 0 1px var(--ln)', fontSize: '13.5px',
    }}>
      <span style={{ flex: 1 }}>{message}</span>
      <div aria-hidden="true" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'conic-gradient(var(--ac) ' + ((remaining / duration) * 360) + 'deg, var(--ln) 0)' }} />
      <button type="button" aria-label="Undo last action" style={{
        minHeight: '40px', display: 'inline-flex', alignItems: 'center', gap: '5px',
        background: 'var(--s1)', color: 'var(--tx)', padding: '0 14px', borderRadius: '8px',
        border: 'none', font: '600 13px var(--f)', cursor: 'pointer'
      }} onClick={onUndo}>
        <ArrowCounterClockwise size={16} aria-hidden="true" /> Undo
      </button>
    </div>
  );
}
