/**
 * 主檔儲存前二次確認：取消／確認可用左右鍵切換，Enter 觸發，Esc 取消
 */

'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type MasterSaveConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 按下確認後呼叫（關閉對話框前） */
  onConfirm: () => void | Promise<void>;
};

export function MasterSaveConfirmDialog({
  open,
  onOpenChange,
  title = '確認儲存',
  description = '即將寫入資料庫，是否確認？',
  confirmLabel = '確認儲存',
  cancelLabel = '取消',
  onConfirm,
}: MasterSaveConfirmDialogProps) {
  const [focusAction, setFocusAction] = useState<'cancel' | 'confirm'>('confirm');
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setFocusAction('confirm');
    requestAnimationFrame(() => {
      confirmRef.current?.focus();
    });
  }, [open]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusAction('cancel');
        cancelRef.current?.focus();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusAction('confirm');
        confirmRef.current?.focus();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const active = focusAction === 'confirm' ? confirmRef.current : cancelRef.current;
        active?.click();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    },
    [close, focusAction],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-master-dialog
        className="gap-4"
        showCloseButton
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-3">
          <button
            ref={cancelRef}
            type="button"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              focusAction === 'cancel' && 'ring-2 ring-ring ring-offset-2',
            )}
            onClick={() => close()}
            onFocus={() => setFocusAction('cancel')}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={cn(buttonVariants(), focusAction === 'confirm' && 'ring-2 ring-ring ring-offset-2')}
            onClick={() => {
              void Promise.resolve(onConfirm()).finally(() => close());
            }}
            onFocus={() => setFocusAction('confirm')}
          >
            {confirmLabel}
          </button>
        </DialogFooter>
        <p className="text-center text-[11px] text-muted-foreground">
          方向鍵 ← → 切換按鈕，Enter 確定，Esc 取消
        </p>
      </DialogContent>
    </Dialog>
  );
}
