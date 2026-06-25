// apps/nx-ui/src/features/sale/ui/inquiry/components/ConfirmDialog.tsx
/**
 * R7 Phase 7-4:通用二次確認彈窗（destructive=true 時確認按鈕染紅）。
 *
 * 目前使用點:
 *   - 「全部不採用,結案」RFQ 確認
 *
 * 之後若有其他危險動作（刪除 vendor quote、放棄整張 QT 等）都可重用。
 */

'use client';

import { useRef } from 'react';
import { AlertCircle } from 'lucide-react';

import { cx } from '@design/utils/cx';
import { useModalLayer } from '@design/primitives/modal-stack';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 破壞性動作:確認按鈕染紅 */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = '確認',
  cancelLabel = '取消',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  useModalLayer(layerRef, onCancel);

  return (
    <div
      ref={layerRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md space-y-4 rounded-t-2xl border border-white/10 bg-[#1a1a1a] p-5 sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2">
          {destructive ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#E24B4A]" aria-hidden />
          ) : null}
          <div className="space-y-1">
            <div className="text-base text-white">{title}</div>
            <div className="text-xs text-white/60">{message}</div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-lg border border-white/20 text-sm text-white/80 transition-colors hover:border-white/40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cx(
              'h-11 flex-[2] rounded-lg text-sm font-medium transition-colors',
              destructive
                ? 'bg-[#E24B4A] text-white hover:bg-[#E24B4A]/90'
                : 'bg-[#E8A020] text-black hover:bg-[#E8A020]/90',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
