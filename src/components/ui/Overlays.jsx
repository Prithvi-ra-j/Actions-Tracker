import React, { useEffect, useState, useRef } from 'react';
import { Button } from './Buttons.jsx';
import { X } from '@phosphor-icons/react';

export function BottomSheet({ isOpen, onClose, title, children }) {
  const previousFocusRef = useRef(null);
  
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose?.(); return; }
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return;
      const focusables = [...dialog.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled);
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    const firstFocusable = document.querySelector('[role="dialog"] button, [role="dialog"] input, [role="dialog"] textarea, [role="dialog"] select');
    firstFocusable?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen && previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
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
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          left: 0, right: 0, bottom: 0,
          backgroundColor: 'var(--s1)',
          borderTopLeftRadius: 'var(--r-sheet)',
          borderTopRightRadius: 'var(--r-sheet)',
          padding: 'var(--space-6) var(--space-4)',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          zIndex: 101,
          animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ 
          width: '32px', height: '4px', backgroundColor: 'var(--s2)', 
          borderRadius: '2px', margin: '0 auto 24px', opacity: 0.5
        }} />
        {title && <h2 style={{ margin: '0 0 16px 0', fontSize: 'var(--space-5)', fontWeight: 600 }}>{title}</h2>}
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
    let timer, frame;
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
      clearTimeout(timer);
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
