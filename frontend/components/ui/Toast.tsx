"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider
      value={{
        toast: addToast,
        success: (msg) => addToast("success", msg),
        error: (msg) => addToast("error", msg),
        info: (msg) => addToast("info", msg),
      }}
    >
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] shadow-[var(--shadow-md)] border text-sm max-w-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-5 ${
              t.type === "success"
                ? "bg-white border-[#82c341] text-[#44535b]"
                : t.type === "error"
                ? "bg-white border-[#fecaca] text-[#991b1b]"
                : "bg-white border-[#dcdcdc] text-[#44535b]"
            }`}
          >
            {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-[#82c341] shrink-0" />}
            {t.type === "error" && <AlertCircle className="w-5 h-5 text-[#ef4444] shrink-0" />}
            {t.type === "info" && <Info className="w-5 h-5 text-[#45525b] shrink-0" />}
            <span className="flex-1 font-medium">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 hover:bg-[#f6f6f7] rounded transition"
            >
              <X className="w-4 h-4 text-[#838383]" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
