import React, { createContext, useContext, useMemo, useState } from 'react';
import { X } from 'lucide-react';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

interface ToastItem {
  id: number;
  title: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (title: string, message?: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => undefined,
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (title: string, message = '', tone: ToastTone = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(current => [...current, { id, title, message, tone }]);
    window.setTimeout(() => {
      setToasts(current => current.filter(item => item.id !== id));
    }, 3200);
  };

  const value = useMemo(() => ({ showToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[70] flex max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const toneClasses: Record<ToastTone, string> = {
            success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
            info: 'border-sky-200 bg-sky-50 text-sky-900',
            warning: 'border-amber-200 bg-amber-50 text-amber-900',
            error: 'border-rose-200 bg-rose-50 text-rose-900',
          };

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-xl border p-3 shadow-lg ${toneClasses[toast.tone]}`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em]">{toast.title}</p>
                  {toast.message && <p className="mt-1 text-xs leading-5">{toast.message}</p>}
                </div>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  className="rounded p-1 text-current/70 hover:text-current"
                  onClick={() => setToasts(current => current.filter(item => item.id !== toast.id))}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
