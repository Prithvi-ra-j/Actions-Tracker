import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now().toString();
    const duration = toast.onUndo ? 8000 : (toast.duration || 4000);
    
    const newToast = {
      ...toast,
      id,
      duration,
      createdAt: Date.now()
    };
    
    setToasts(prev => [...prev, newToast]);
    
    if (duration !== Infinity) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        left: '16px',
        right: '16px',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none'
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

import React from 'react';
import { ArrowCounterClockwise } from '@phosphor-icons/react';

export function Toast({ message, onUndo }) {
  return (
    <div className="ui-toast" role="status" aria-live="polite">
      <span>{message}</span>
      {onUndo && <button type="button" onClick={onUndo}>Undo</button>}
    </div>
  );
}
