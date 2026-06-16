// apps/nx-ui/src/features/sale/ui/sop-workspace/components/FloatingToast.tsx
/**
 * R7 Phase 5：SOP 工作台內的簡易浮動提示。
 *
 * 不引入額外 toast 函式庫（春酒倒數不動依賴）。純 React state + timer 自動關閉。
 * 呼叫端維護 message state，null 時不 render。
 *
 * 預設 3 秒自動消失；type='success' 綠色、'info' 白、'warning' 金。
 */

'use client';

import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

import { cx } from '@design/utils/cx';

export type ToastType = 'success' | 'info' | 'warning';

interface FloatingToastProps {
  message: string;
  type?: ToastType;
  /** 自動關閉毫秒數，預設 3000 */
  durationMs?: number;
  onClose: () => void;
}

const CONFIG = {
  success: {
    Icon: CheckCircle2,
    bg: 'bg-[#1D9E75]/90',
  },
  info: {
    Icon: Info,
    bg: 'bg-white/90 text-black',
  },
  warning: {
    Icon: AlertCircle,
    bg: 'bg-[#E8A020]/90',
  },
} as const;

export function FloatingToast({
  message,
  type = 'success',
  durationMs = 3000,
  onClose,
}: FloatingToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [onClose, durationMs]);

  const { Icon, bg } = CONFIG[type];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        'pointer-events-none fixed inset-x-4 bottom-24 z-[60]',
        'mx-auto max-w-md rounded-lg p-3 shadow-lg',
        'flex items-center gap-2 text-sm text-white',
        bg,
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
