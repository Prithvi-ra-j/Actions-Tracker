import React, { useEffect, useState, useRef, useId, useLayoutEffect } from 'react';
import { Button } from './Buttons.jsx';

const openSheets = [];
const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function BottomSheet({ isOpen, onClose, title, label, children }) {
  const sheetRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    const sheet = sheetRef.current;
    const previousFocus = document.activeElement;
    openSheets.push(sheet);
    sheet.querySelector(focusableSelector)?.focus();

    const onKeyDown = event => {
      if (openSheets[openSheets.length - 1] !== sheet) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
      } else if (event.key === 'Tab') {
        const focusable = [...sheet.querySelectorAll(focusableSelector)]
          .filter(element => !element.closest('[hidden], [inert], [aria-hidden="true"]'));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first) {
          event.preventDefault();
          sheet.focus();
        } else if (event.shiftKey && (document.activeElement === first || !sheet.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !sheet.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const index = openSheets.indexOf(sheet);
      if (index !== -1) openSheets.splice(index, 1);
      if (previousFocus?.isConnected && (!openSheets.length || openSheets[openSheets.length - 1].contains(previousFocus))) {
        previousFocus.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 100,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />
      <div 
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : (label || 'Details')}
        tabIndex={-1}
        style={{
          position: 'fixed',
          left: 0, right: 0, bottom: 0,
          maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 12px)',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          boxSizing: 'border-box',
          backgroundColor: 'var(--s1)',
          borderTopLeftRadius: 'var(--r-sheet)',
          borderTopRightRadius: 'var(--r-sheet)',
          padding: '24px 16px',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          zIndex: 101,
          animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ 
          width: '32px', height: '4px', backgroundColor: 'var(--s2)', 
          borderRadius: '2px', margin: '0 auto 24px', opacity: 0.5
        }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
          {title ? <h2 id={titleId} style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{title}</h2> : <span />}
          <button type="button" onClick={onClose} aria-label="Close dialog" style={{
            minWidth: '44px', minHeight: '44px', border: '1px solid var(--hairline)',
            borderRadius: 'var(--r-control)', background: 'var(--s2)', color: 'var(--tx)',
            fontSize: '22px', cursor: 'pointer',
          }}>×</button>
        </div>
        <div>{children}</div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </>
  );
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, description, destructive = true }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame;
    if (holding) {
      const start = Date.now();
      const duration = 600; // 600ms hold-to-confirm
      
      const tick = () => {
        const elapsed = Date.now() - start;
        if (elapsed >= duration) {
          setProgress(100);
          onConfirm();
          setHolding(false);
        } else {
          setProgress((elapsed / duration) * 100);
          frame = requestAnimationFrame(tick);
        }
      };
      frame = requestAnimationFrame(tick);
    } else {
      setProgress(0);
    }
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [holding, onConfirm]);

  if (!isOpen) return null;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <p style={{ color: 'var(--mu)', marginBottom: '24px', marginTop: 0, lineHeight: 1.5 }}>
        {description}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          onPointerDown={() => setHolding(true)}
          onPointerUp={() => setHolding(false)}
          onPointerLeave={() => setHolding(false)}
          onKeyDown={event => {
            if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
              event.preventDefault();
              setHolding(true);
            }
          }}
          onKeyUp={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setHolding(false);
            }
          }}
          onBlur={() => setHolding(false)}
          style={{
            position: 'relative',
            height: '48px',
            borderRadius: 'var(--r-control)',
            border: 'none',
            backgroundColor: destructive ? 'var(--s2)' : 'var(--ac)',
            color: destructive ? 'var(--danger)' : 'var(--on-ac)',
            fontSize: '15px',
            fontWeight: 600,
            overflow: 'hidden',
            cursor: 'pointer'
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0, left: 0, bottom: 0,
            width: `${progress}%`,
            backgroundColor: destructive ? 'rgba(229, 72, 77, 0.2)' : 'rgba(255, 255, 255, 0.2)',
            transition: 'width 0.1s linear'
          }} />
          <span style={{ position: 'relative', zIndex: 1 }}>Hold to confirm</span>
        </button>
        <Button variant="secondary" onClick={onClose} style={{ width: '100%' }}>
          Cancel
        </Button>
      </div>
    </BottomSheet>
  );
}

export function Toast({ message, onUndo }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
      left: '16px',
      right: '16px',
      backgroundColor: 'var(--tx)',
      color: 'var(--bg)',
      padding: '12px 16px',
      borderRadius: 'var(--r-container)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      zIndex: 200,
      animation: 'slideUpToast 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <span style={{ fontSize: '14px', fontWeight: 500 }}>{message}</span>
      {onUndo && (
        <button
          onClick={onUndo}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--bg)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            padding: '4px 8px'
          }}
        >
          Undo
        </button>
      )}
      <style>{`
        @keyframes slideUpToast { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
