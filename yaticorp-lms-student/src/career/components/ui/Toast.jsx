import { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

const VARIANTS = {
  success: { icon: CheckCircle2, ring: 'ring-emerald-200', iconClass: 'text-emerald-600', bar: 'bg-emerald-500' },
  error:   { icon: AlertCircle,  ring: 'ring-red-200',     iconClass: 'text-red-600',     bar: 'bg-red-500' },
  info:    { icon: Info,         ring: 'ring-brand-200',   iconClass: 'text-link',   bar: 'bg-brand-500' }
};

function Toast({ toast, onDismiss }) {
  const { icon: Icon, ring, iconClass, bar } = VARIANTS[toast.variant] || VARIANTS.info;
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 200);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    if (toast.duration === 0) return;
    const timer = setTimeout(dismiss, toast.duration);
    return () => clearTimeout(timer);
  }, [dismiss, toast.duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto w-full overflow-hidden rounded-xl bg-surface shadow-float ring-1 ${ring} transition-all duration-200 ${
        leaving ? 'translate-x-6 opacity-0' : 'animate-slide-in'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} />
        <div className="min-w-0 flex-1">
          {toast.title && <p className="text-sm font-semibold text-ink-900">{toast.title}</p>}
          {/* AI/quota errors can be long, so let them wrap and scroll rather than clip. */}
          <p className="max-h-40 overflow-y-auto text-sm leading-relaxed break-words text-ink-600">
            {toast.message}
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss notification"
          className="rounded-md p-1 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className={`h-0.5 w-full ${bar} opacity-70`} />
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message, { title, variant = 'info', duration = 6000 } = {}) => {
    // Errors stay longer - they usually carry an instruction to act on.
    const resolved = duration ?? (variant === 'error' ? 9000 : 6000);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, title, variant, duration: resolved }]);
    return id;
  }, []);

  const toast = {
    success: (message, title = 'Success') => push(message, { title, variant: 'success' }),
    error: (message, title = 'Something went wrong') => push(message, { title, variant: 'error', duration: 9000 }),
    info: (message, title) => push(message, { title, variant: 'info' })
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
