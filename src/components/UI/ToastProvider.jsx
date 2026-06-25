// Phase 6: Toast Notification System
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const colors = {
    info: { bg: 'rgba(0, 229, 255, 0.15)', border: 'rgba(0, 229, 255, 0.4)', text: '#00e5ff' },
    success: { bg: 'rgba(0, 255, 136, 0.15)', border: 'rgba(0, 255, 136, 0.4)', text: '#00ff88' },
    warning: { bg: 'rgba(255, 200, 0, 0.15)', border: 'rgba(255, 200, 0, 0.4)', text: '#ffc800' },
    error: { bg: 'rgba(255, 23, 68, 0.15)', border: 'rgba(255, 23, 68, 0.4)', text: '#ff1744' }
  };
  const c = colors[toast.type] || colors.info;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: '10px 16px',
        borderRadius: 10,
        background: c.bg,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${c.border}`,
        color: c.text,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
        pointerEvents: 'auto',
        maxWidth: 320,
        wordBreak: 'break-word'
      }}
    >
      {toast.message}
    </div>
  );
}
