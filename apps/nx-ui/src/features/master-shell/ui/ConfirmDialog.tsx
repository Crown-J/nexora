// apps/nx-ui/src/features/master-shell/ui/ConfirmDialog.tsx
/**
 * NEXORA Master Shell — ConfirmDialog
 *
 * 抽自 lab/users（commit 43）通用確認對話框，用於存檔、刪除、批次操作等。
 *
 * 用法：
 *   const [confirm, setConfirm] = useState<ConfirmState | null>(null);
 *   ...
 *   setConfirm({ title: '確認刪除', message: '...', variant: 'danger', onConfirm: () => {...} });
 *   ...
 *   <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
 *
 * 兩種變體：default（琥珀）/ danger（鋼鐵紅）。
 */
'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ConfirmState = {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
};

export function ConfirmDialog({
  state,
  onClose,
}: {
  state: ConfirmState | null;
  onClose: () => void;
}) {
  if (!state) return null;
  const isDanger = state.variant === 'danger';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[#2A2A30] bg-[#131316] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl border',
              isDanger
                ? 'border-[#5A2A2A] bg-[#1F1212] text-[#C84A4A]'
                : 'border-[#E8A020]/40 bg-[#E8A020]/10 text-[#E8A020]',
            )}
          >
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-[#E8E8EB]">{state.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#888892]">{state.message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded-md border border-[#2A2A30] bg-[#1A1A1F] px-3 text-xs font-medium text-[#B8B8C0] transition-colors hover:border-[#3A3A42] hover:bg-[#22222A] hover:text-[#E8E8EB]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              state.onConfirm();
              onClose();
            }}
            className={cn(
              'inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors',
              isDanger
                ? 'border-[#5A2A2A] bg-[#1F1212] text-[#C84A4A] hover:border-[#7A3A3A] hover:bg-[#2A1818] hover:text-[#E26060]'
                : 'border-[#E8A020]/40 bg-[#E8A020]/15 text-[#E8A020] hover:bg-[#E8A020]/25',
            )}
          >
            {state.confirmLabel ?? '確認'}
          </button>
        </div>
      </div>
    </div>
  );
}
