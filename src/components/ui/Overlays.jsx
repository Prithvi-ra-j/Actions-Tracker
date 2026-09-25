import React from 'react';
import { Button } from './Buttons.jsx';

export function BottomSheet({ isOpen, onClose, title, children }) {
  const previousFocusRef = React.useRef(null);
  React.useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose?.(); return; }
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return;
      const focusables = [...dialog.querySelectorAll('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled);
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    document.querySelector('[role="dialog"] button,[role="dialog"] input,[role="dialog"] textarea,[role="dialog"] select')?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);
  React.useEffect(() => { if (!isOpen) previousFocusRef.current?.focus?.(); }, [isOpen]);
  if (!isOpen) return null;
  return <>
    <div className="ui-sheet-backdrop" onClick={onClose} />
    <div role="dialog" aria-modal="true" className="ui-sheet">
      <div className="ui-sheet-handle" aria-hidden="true" />
      {title && <h2 className="ui-sheet-title">{title}</h2>}
      <div>{children}</div>
    </div>
  </>;
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, description, destructive = true }) {
  const [holding, setHolding] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    if (!holding) { setProgress(0); return; }
    const start = Date.now(), duration = 600;
    const tick = () => {
      const elapsed = Date.now() - start;
      if (elapsed >= duration) { setProgress(100); onConfirm(); setHolding(false); return; }
      setProgress((elapsed / duration) * 100);
      requestAnimationFrame(tick);
    };
    const frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [holding, onConfirm]);
  if (!isOpen) return null;
  return <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
    <p className="ui-confirm-copy">{description}</p>
    <div className="ui-confirm-actions">
      <button
        type="button"
        onPointerDown={() => setHolding(true)}
        onPointerUp={() => setHolding(false)}
        onPointerLeave={() => setHolding(false)}
        className="ui-confirm-hold"
        style={{ '--progress': progress }}
      >
        <span aria-hidden="true" className="ui-confirm-progress" />
        <span>Hold to confirm</span>
      </button>
      <Button variant="secondary" onClick={onClose} style={{ width: '100%' }}>Cancel</Button>
    </div>
  </BottomSheet>;
}
