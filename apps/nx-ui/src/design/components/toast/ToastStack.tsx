// apps/nx-ui/src/design/components/toast/ToastStack.tsx
/**
 * NEXORA Master Shell — ToastStack + useToast hook
 *
 * 抽自 lab/users（commit 43.1）右上角自動消失通知。
 *
 * 用法：
 *   const { toasts, showToast } = useToast();
 *   ...
 *   <ToastStack toasts={toasts} />
 *
 * 三色（success/info/danger）對應琥珀 / 琥珀 / 鋼鐵紅。
 * 自動 2.4s 移除。
 */
'use client';

import { useCallback, useRef, useState } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@design/utils/cn';

export type ToastVariant = 'info' | 'success' | 'danger';

export type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

export function useToast(autoDismissMs = 2400) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, autoDismissMs);
    },
    [autoDismissMs],
  );

  return { toasts, showToast };
}

export function ToastStack({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed right-6 top-20 z-40 flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const Icon = t.variant === 'success' ? CheckCircle2 : t.variant === 'danger' ? XCircle : Info;
        // success / info 都收斂到琥珀；danger 用鋼鐵紅（不飽和）
        const tone =
          t.variant === 'danger'
            ? 'border-[#5A2A2A] text-[#E26060]'
            : 'border-[#E8A020]/40 text-[#E8A020]';
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2 rounded-xl border bg-[#131316]/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-md',
              tone,
            )}
          >
            <Icon className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 leading-relaxed">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
