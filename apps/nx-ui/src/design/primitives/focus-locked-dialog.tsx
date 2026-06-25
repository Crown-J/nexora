// apps/nx-ui/src/design/primitives/focus-locked-dialog.tsx
// 全站 modal 包殼（軌 A、執行長 2026-06-24 拍板方案 A）
//
// 用法（取代既有的 `<div className="fixed inset-0 z-50 ...">`）：
//
//   <FocusLockedDialog
//     open={open}
//     onClose={onClose}
//     backdropClassName="bg-black/70 backdrop-blur-sm"
//     dialogClassName="w-full max-w-sm rounded-2xl border ..."
//   >
//     ...dialog 內容...
//   </FocusLockedDialog>
//
// 行為（驗收條件 1/5/6 全套）：
//   1. mount 時 push 全域 stack；unmount 時 pop
//   2. 開啟時：記下開啟前的 activeElement、自動 focus 進 dialog（initialFocus 或首個 focusable）
//   3. 關閉時：將焦點還原到開啟前的 activeElement
//   4. Tab 鍵循環 trap：前後 sentinel 接管 Tab，把焦點拉回 dialog 內
//   5. Esc：呼叫 onClose（onClose 為 null 不接 Esc、調用者控制）
//   6. 背景 click：closeOnBackdropClick=true 時呼叫 onClose
//   7. 多層彈窗：z-index 依 stack 深度遞增、只有最上層收鍵盤（由 modal-stack guard 控）
'use client';

import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { cn } from '@design/utils/cn';
import {
  findFirstFocusable,
  findLastFocusable,
  isTopLayer,
  popLayer,
  pushLayer,
} from './modal-stack';

type Props = {
  open: boolean;
  onClose?: () => void;

  /** Esc 是否關閉（預設 true、給 onClose 即啟用）*/
  closeOnEscape?: boolean;
  /** 背景 click 是否關閉（預設 true、給 onClose 即啟用）*/
  closeOnBackdropClick?: boolean;

  /** 開啟時第一個聚焦的 element；不給時自動聚焦首個 focusable */
  initialFocusRef?: RefObject<HTMLElement | null>;

  /** dialog 角色（預設 dialog；確認對話用 alertdialog）*/
  role?: 'dialog' | 'alertdialog';
  ariaLabel?: string;
  ariaLabelledBy?: string;

  /** outer wrapper（含 backdrop）className；shape 預設 fixed inset-0 + 置中 + 彈窗 z-index */
  backdropClassName?: string;
  /** dialog 內容 wrapper className（卡片本體樣式由 caller 決定）*/
  dialogClassName?: string;
  /** dialog 內容 style（給特定 modal 自訂 width/height 用）*/
  dialogStyle?: React.CSSProperties;

  children: ReactNode;
};

const Z_BASE = 1000; // 起始 z-index、每層 +10 (10 層內足夠)

export function FocusLockedDialog({
  open,
  onClose,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  initialFocusRef,
  role = 'dialog',
  ariaLabel,
  ariaLabelledBy,
  backdropClassName,
  dialogClassName,
  dialogStyle,
  children,
}: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const layerIdRef = useRef<number | null>(null);

  // mount: push stack + 記前焦點 + 移焦點進 dialog
  useEffect(() => {
    if (!open) return;
    const el = layerRef.current;
    if (!el) return;
    const prevFocus = (document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null);
    const id = pushLayer({
      element: el,
      prevFocus,
      allowBackdropClose: closeOnBackdropClick && !!onClose,
      onEscape: closeOnEscape && onClose ? onClose : undefined,
    });
    layerIdRef.current = id;

    // 開啟時把焦點移入 dialog
    queueMicrotask(() => {
      const target = initialFocusRef?.current ?? findFirstFocusable(el) ?? el;
      target.focus();
    });

    return () => {
      const removed = popLayer(id);
      // 還原焦點到開啟前的 activeElement（驗收條件 5）
      if (removed?.prevFocus && document.body.contains(removed.prevFocus)) {
        // 用 microtask 等 React unmount 完
        queueMicrotask(() => removed.prevFocus?.focus());
      }
      layerIdRef.current = null;
    };
  }, [open, closeOnBackdropClick, closeOnEscape, onClose, initialFocusRef]);

  // Esc 處理：layer 內部 onKeyDown（target 在 layer 內、guard 已放行）
  // 只有最上層 layer 才接 Esc（驗收條件 6 多層 Esc 逐層回退）
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!closeOnEscape || !onClose) return;
      if (e.key !== 'Escape') return;
      if (e.nativeEvent.isComposing) return;
      const id = layerIdRef.current;
      if (id == null || !isTopLayer(id)) return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    },
    [closeOnEscape, onClose],
  );

  // backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!closeOnBackdropClick || !onClose) return;
      // 只在點擊 backdrop 本身才關
      if (e.target !== e.currentTarget) return;
      onClose();
    },
    [closeOnBackdropClick, onClose],
  );

  // Tab sentinel：跳到前 sentinel → 焦點轉到 layer 內最後一個 focusable（loop）
  const handleSentinelFocus = useCallback((position: 'start' | 'end') => {
    const el = layerRef.current;
    if (!el) return;
    const target =
      position === 'start' ? findLastFocusable(el) : findFirstFocusable(el);
    target?.focus();
  }, []);

  if (!open) return null;

  return (
    <div
      ref={layerRef}
      className={cn(
        'fixed inset-0 flex items-center justify-center',
        backdropClassName ?? 'bg-black/60 backdrop-blur-sm',
      )}
      style={{ zIndex: Z_BASE }}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      data-modal-layer
      role={role}
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      {/* 前 sentinel：Shift+Tab 從 dialog 首個元素出來、focus 進這、轉到 dialog 最後一個 */}
      <span
        tabIndex={0}
        data-fl-sentinel="start"
        onFocus={() => handleSentinelFocus('start')}
        aria-hidden="true"
        className="sr-only"
      />
      <div
        className={dialogClassName}
        style={dialogStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
      {/* 後 sentinel：Tab 從 dialog 最後元素出來、focus 進這、轉到 dialog 首個 */}
      <span
        tabIndex={0}
        data-fl-sentinel="end"
        onFocus={() => handleSentinelFocus('end')}
        aria-hidden="true"
        className="sr-only"
      />
    </div>
  );
}
