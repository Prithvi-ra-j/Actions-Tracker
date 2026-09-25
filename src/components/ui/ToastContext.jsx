import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((toast) => {
    const id = Date.now().toString();
    const duration = toast.onUndo ? 8000 : (toast.duration || 4000);
    setToasts(prev => [...prev, { ...toast, id, duration, createdAt: Date.now() }]);
    if (duration !== Infinity) setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    return id;
  }, []);
  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="ui-toast-stack">
        {toasts.map(t => <Toast key={t.id} toast={t} onRemove={() => removeToast(t.id)} />)}
      </div>
    </ToastContext.Provider>
  );
}
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
function Toast({ toast, onRemove }) {
  return (
    <div className="ui-toast" role="status" aria-live="polite">
      <span>{toast.message}</span>
      {toast.onUndo && <button type="button" onClick={() => { toast.onUndo(); onRemove(); }}>Undo</button>}
    </div>
  );
}
