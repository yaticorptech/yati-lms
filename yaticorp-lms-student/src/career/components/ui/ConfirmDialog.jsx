import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
};

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);
  const confirmButtonRef = useRef(null);

  // Returns a promise so callers can `await confirm({...})` just like window.confirm.
  const confirm = useCallback((options) => {
    setDialog({
      title: 'Are you sure?',
      message: '',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      destructive: false,
      ...options
    });
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  useEffect(() => {
    if (!dialog) return;
    confirmButtonRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialog, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 animate-fade-in bg-slate-900/50"
            onClick={() => close(false)}
          />
          <div className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-xl bg-surface shadow-float">
            <button
              onClick={() => close(false)}
              aria-label="Close dialog"
              className="absolute top-4 right-4 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-700"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6">
              <div className="flex gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                    dialog.destructive ? 'bg-red-50' : 'bg-brand-50'
                  }`}
                >
                  <AlertTriangle
                    className={`h-5 w-5 ${dialog.destructive ? 'text-red-600' : 'text-link'}`}
                  />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h2 id="confirm-title" className="text-lg font-bold text-ink-900">
                    {dialog.title}
                  </h2>
                  {dialog.message && (
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{dialog.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-line-100 bg-surface-50 px-6 py-4">
              <button
                onClick={() => close(false)}
                className="rounded-lg border border-line-300 bg-surface px-4 py-2 text-sm font-semibold text-ink-700 transition-all hover:bg-surface-50 active:scale-[0.98]"
              >
                {dialog.cancelLabel}
              </button>
              <button
                ref={confirmButtonRef}
                onClick={() => close(true)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] ${
                  dialog.destructive
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-brand-600 hover:bg-brand-700'
                }`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
