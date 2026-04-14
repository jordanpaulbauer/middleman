import React, { createContext, useContext, useState, useCallback } from 'react';
import { X } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const duration = toast.duration || 4000;
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type === 'success' ? 'toast-success' : t.type === 'error' ? 'toast-error' : ''}`}>
            <div style={{ flex: 1 }}>
              <div className="toast-title">{t.title}</div>
              {t.message && <div className="toast-body">{t.message}</div>}
              {t.action && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={t.action.onClick}>
                  {t.action.label}
                </button>
              )}
            </div>
            <button className="modal-close" onClick={() => removeToast(t.id)} style={{ flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
