'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type ToastVariant = 'default' | 'success' | 'error';

type ToastItem = {
  id: number;
  message: string;
  description?: string;
  variant: ToastVariant;
};

const listeners = new Set<(toast: ToastItem) => void>();

export function toast(message: string, opts?: { description?: string; variant?: ToastVariant }) {
  const item: ToastItem = {
    id: Date.now() + Math.random(),
    message,
    description: opts?.description,
    variant: opts?.variant ?? 'default',
  };
  listeners.forEach((l) => l(item));
}

const variantStyles: Record<ToastVariant, string> = {
  default: 'border-border bg-popover text-popover-foreground',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
};

export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    const add = (t: ToastItem) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 4000);
    };
    listeners.add(add);
    return () => {
      listeners.delete(add);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg',
            variantStyles[t.variant]
          )}
        >
          <p className="font-medium">{t.message}</p>
          {t.description && <p className="mt-0.5 text-xs opacity-80">{t.description}</p>}
        </div>
      ))}
    </div>
  );
}
