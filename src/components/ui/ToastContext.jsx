import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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

function ToastItem({ toast, onRemove }) {
  const { message, onUndo, duration } = toast;
  
  return (
    <div style={{
      backgroundColor: 'var(--tx)',
      color: 'var(--bg)',
      padding: '12px 16px',
      borderRadius: 'var(--r-container)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      animation: 'slideUpToast 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      pointerEvents: 'auto'
    }}>
      <span style={{ fontSize: '14px', fontWeight: 500 }}>{message}</span>
      {onUndo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <UndoRing duration={duration} />
          <button
            onClick={() => {
              onUndo();
              onRemove();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ac)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              padding: '4px 0'
            }}
          >
            Undo
          </button>
        </div>
      )}
      <style>{`
        @keyframes slideUpToast { 
          from { transform: translateY(20px); opacity: 0; } 
          to { transform: translateY(0); opacity: 1; } 
        }
      `}</style>
    </div>
  );
}

function UndoRing({ duration }) {
  const size = 20;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          stroke="rgba(0,0,0,0.1)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke="var(--ac)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={0}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ 
            animation: `countdownRing ${duration}ms linear forwards` 
          }}
        />
      </svg>
      <style>{`
        @keyframes countdownRing {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: ${circumference}; }
        }
      `}</style>
    </div>
  );
}
