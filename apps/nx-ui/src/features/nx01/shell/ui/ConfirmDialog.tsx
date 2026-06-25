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

import { useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';
import { cn } from '@design/utils/cn';

export type ConfirmState = {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  /** 軌 C C2：3-way confirm 第三個按鈕（如「不儲存」、「丟棄變更」）。
   *  提供時底部變為 [取消] [secondary] [confirm]，常見於 dirty state「儲存 / 不儲存 / 取消」3 選 1。 */
  secondaryAction?: {
    label: string;
    onClick: () => void;
    /** 視覺變體：'default' = 中性 grey、'danger' = 鋼鐵紅（如「丟棄變更」） */
    variant?: 'default' | 'danger';
  };
};

export function ConfirmDialog({
  state,
  onClose,
}: {
  state: ConfirmState | null;
  onClose: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // 軌 A：FocusLockedDialog 接管 Esc + focus trap + 背景隔離；
  // Enter 由 native button focus 處理（瀏覽器原生：focused button + Enter 自動 click）；
  // D 鍵在 dialog 內 onKeyDown 接（避開全域 window listener）。
  // confirmRef autofocus 改用 FocusLockedDialog 的 initialFocusRef。

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!state) return;
      if (e.nativeEvent.isComposing) return;
      if ((e.key === 'd' || e.key === 'D') && state.secondaryAction) {
        e.preventDefault();
        state.secondaryAction.onClick();
        onClose();
      }
    },
    [state, onClose],
  );

  if (!state) return null;
  const isDanger = state.variant === 'danger';
  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      initialFocusRef={confirmRef}
      role="alertdialog"
      ariaLabel={state.title}
      backdropClassName="bg-black/70 backdrop-blur-sm"
      dialogClassName="w-full max-w-sm rounded-2xl border border-[#2A2A30] bg-[#131316] p-5 shadow-2xl"
    >
      <div onKeyDown={handleKeyDown}>
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
            className="inline-flex h-8 items-center gap-1 rounded-md border border-[#2A2A30] bg-[#1A1A1F] px-3 text-xs font-medium text-[#B8B8C0] outline-none transition-colors hover:border-[#3A3A42] hover:bg-[#22222A] hover:text-[#E8E8EB]"
          >
            取消
            <kbd className="ml-0.5 hidden rounded border border-[#3A3A42] px-1 text-[9px] text-[#5A5A60] sm:inline">Esc</kbd>
          </button>
          {state.secondaryAction ? (
            <button
              type="button"
              onClick={() => {
                state.secondaryAction?.onClick();
                onClose();
              }}
              className={cn(
                'inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-medium outline-none transition-colors',
                state.secondaryAction.variant === 'danger'
                  ? 'border-[#5A2A2A] bg-[#1F1212] text-[#C84A4A] hover:border-[#7A3A3A] hover:bg-[#2A1818] hover:text-[#E26060]'
                  : 'border-[#3A3A42] bg-[#22222A] text-[#B8B8C0] hover:bg-[#2A2A30] hover:text-[#E8E8EB]',
              )}
            >
              {state.secondaryAction.label}
              <kbd className="ml-0.5 hidden rounded border border-current px-1 text-[9px] opacity-70 sm:inline">D</kbd>
            </button>
          ) : null}
          <button
            ref={confirmRef}
            type="button"
            onClick={() => {
              state.onConfirm();
              onClose();
            }}
            className={cn(
              'inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-medium outline-none ring-2 ring-offset-2 ring-offset-[#131316] transition-colors',
              isDanger
                ? 'border-[#5A2A2A] bg-[#1F1212] text-[#C84A4A] ring-[#C84A4A]/50 hover:border-[#7A3A3A] hover:bg-[#2A1818] hover:text-[#E26060]'
                : 'border-[#E8A020]/40 bg-[#E8A020]/15 text-[#E8A020] ring-[#E8A020]/60 hover:bg-[#E8A020]/25',
            )}
          >
            {state.confirmLabel ?? '確認'}
            <kbd className="ml-0.5 hidden rounded border border-current px-1 text-[9px] opacity-70 sm:inline">Enter</kbd>
          </button>
        </div>
      </div>
    </FocusLockedDialog>
  );
}
