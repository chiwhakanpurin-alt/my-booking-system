'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 4000
}

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const STYLES = {
  success: {
    wrapper: 'border-emerald-200/70 dark:border-emerald-800/50 bg-white/90 dark:bg-zinc-900/90',
    icon: 'text-emerald-500',
    bar: 'bg-emerald-500',
    title: 'text-slate-900 dark:text-white',
    message: 'text-slate-500 dark:text-zinc-400',
    glow: 'shadow-emerald-500/10',
  },
  error: {
    wrapper: 'border-rose-200/70 dark:border-rose-800/50 bg-white/90 dark:bg-zinc-900/90',
    icon: 'text-rose-500',
    bar: 'bg-rose-500',
    title: 'text-slate-900 dark:text-white',
    message: 'text-slate-500 dark:text-zinc-400',
    glow: 'shadow-rose-500/10',
  },
  warning: {
    wrapper: 'border-amber-200/70 dark:border-amber-800/50 bg-white/90 dark:bg-zinc-900/90',
    icon: 'text-amber-500',
    bar: 'bg-amber-500',
    title: 'text-slate-900 dark:text-white',
    message: 'text-slate-500 dark:text-zinc-400',
    glow: 'shadow-amber-500/10',
  },
  info: {
    wrapper: 'border-indigo-200/70 dark:border-indigo-800/50 bg-white/90 dark:bg-zinc-900/90',
    icon: 'text-indigo-500',
    bar: 'bg-indigo-500',
    title: 'text-slate-900 dark:text-white',
    message: 'text-slate-500 dark:text-zinc-400',
    glow: 'shadow-indigo-500/10',
  },
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = toast.duration ?? 4000;

  const Icon = ICONS[toast.type];
  const style = STYLES[toast.type];

  // Slide in
  useEffect(() => {
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(t);
  }, []);

  // Auto-dismiss with progress
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (pct === 0) {
        clearInterval(interval);
        handleDismiss();
      }
    }, 16);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [onDismiss, toast.id]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        transform: visible ? 'translateX(0)' : 'translateX(calc(100% + 24px))',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease',
      }}
      className={`
        relative w-80 sm:w-96 overflow-hidden
        rounded-2xl border backdrop-blur-xl
        shadow-xl ${style.glow}
        ${style.wrapper}
      `}
    >
      {/* Content */}
      <div className="flex items-start gap-3 p-4 pr-10">
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${style.icon}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold leading-snug ${style.title}`}>{toast.title}</p>
          {toast.message && (
            <p className={`text-xs mt-0.5 leading-relaxed ${style.message}`}>{toast.message}</p>
          )}
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={handleDismiss}
        aria-label="ปิดการแจ้งเตือน"
        className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-slate-100 dark:bg-zinc-800">
        <div
          className={`h-full ${style.bar} transition-none`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Toast Container ─── */
interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      aria-label="การแจ้งเตือน"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

/* ─── useToast hook ─── */
export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((data: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...data, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'success', title, message, duration }),
    error: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'error', title, message, duration }),
    warning: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'warning', title, message, duration }),
    info: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'info', title, message, duration }),
  };

  return { toasts, toast, dismissToast };
}
