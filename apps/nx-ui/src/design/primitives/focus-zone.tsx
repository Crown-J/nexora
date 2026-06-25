// apps/nx-ui/src/design/primitives/focus-zone.tsx
// 全站「焦點黏著」primitive（執行長 2026-06-25 拍板方案 A、軌 1）
//
// 問題：B 模式區域（row button onKeyDown + 依 DOM focus）、點 row 間空白後 focus 飄 body、
//      方向鍵無接收對象 → 失效。
//
// 解法：
//   1. 容器加 tabIndex={0}、自己可接 focus
//   2. mousedown 攔截：點容器空白（非 focusable 子元素）→ preventDefault + 容器自己 focus
//      → focus 永不飄 body
//   3. 容器 onKeyDown 路由方向鍵到 callback（state 操作、focus 由 caller 自己 setFocus row）
//
// 用法（取代既有 listRef + row onKeyDown 的 fallback）：
//
//   <FocusZone
//     onArrowDown={() => setHighlightIndex(i => Math.min(rows.length - 1, i + 1))}
//     onArrowUp={() => setHighlightIndex(i => Math.max(0, i - 1))}
//     onEnter={() => selectRow(rows[highlightIndex])}
//   >
//     <ul>...row buttons...</ul>
//   </FocusZone>
//
// 預設 scope='space-only'：容器 onKeyDown 只在 e.target===e.currentTarget 才跑
//   · 避免和 row button 自己的 onKeyDown 雙觸發
//   · row 內部按方向鍵走 row keydown、focus 在容器空白時走容器 keydown
//   · 若 caller 不在 row 上綁 onKeyDown、改 scope='all' 讓容器接所有冒泡
'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';

import { cn } from '@design/utils/cn';

type KeyHandler = (e: ReactKeyboardEvent<HTMLDivElement>) => void;

type Props = {
  onArrowDown?: KeyHandler;
  onArrowUp?: KeyHandler;
  onArrowLeft?: KeyHandler;
  onArrowRight?: KeyHandler;
  onPageDown?: KeyHandler;
  onPageUp?: KeyHandler;
  onHome?: KeyHandler;
  onEnd?: KeyHandler;
  onEnter?: KeyHandler;
  onEscape?: KeyHandler;
  /** 通用 keydown（給 Alt+F 等特殊鍵；上面內建 key 對應的 e 不會 preventDefault、由 caller 決定）*/
  onKeyDown?: KeyHandler;

  className?: string;
  /** 預設 true：點容器空白 → preventDefault + 容器 focus、阻止焦點飄 body */
  pullbackOnBlank?: boolean;
  /**
   * 預設 'space-only'：容器 onKeyDown 只在 target===currentTarget 才跑（focus 在容器自己時）。
   * 設為 'all' 則接所有冒泡上來的 keydown（含 row 內部）；caller 要小心和 row onKeyDown 雙觸發。
   */
  scope?: 'space-only' | 'all';
  /** 自訂 role（如 listbox / grid）*/
  role?: string;
  ariaLabel?: string;
  /** 容器是否要列入 Tab 鏈、預設 0；可設 -1 讓 Tab 跳過但仍可程式 focus */
  tabIndex?: number;

  children: ReactNode;
};

export const FocusZone = forwardRef<HTMLDivElement, Props>(function FocusZone(
  {
    onArrowDown,
    onArrowUp,
    onArrowLeft,
    onArrowRight,
    onPageDown,
    onPageUp,
    onHome,
    onEnd,
    onEnter,
    onEscape,
    onKeyDown,
    className,
    pullbackOnBlank = true,
    scope = 'space-only',
    role,
    ariaLabel,
    tabIndex = 0,
    children,
  },
  outerRef,
) {
  const innerRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(outerRef, () => innerRef.current as HTMLDivElement);

  const handleKey = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      // scope='space-only'：focus 在內部元素時、不在這層處理（讓 row 自己接）
      if (scope === 'space-only' && e.target !== e.currentTarget) return;
      if (e.nativeEvent.isComposing) return;

      switch (e.key) {
        case 'ArrowDown':
          onArrowDown?.(e);
          break;
        case 'ArrowUp':
          onArrowUp?.(e);
          break;
        case 'ArrowLeft':
          onArrowLeft?.(e);
          break;
        case 'ArrowRight':
          onArrowRight?.(e);
          break;
        case 'PageDown':
          onPageDown?.(e);
          break;
        case 'PageUp':
          onPageUp?.(e);
          break;
        case 'Home':
          onHome?.(e);
          break;
        case 'End':
          onEnd?.(e);
          break;
        case 'Enter':
          onEnter?.(e);
          break;
        case 'Escape':
          onEscape?.(e);
          break;
      }
      onKeyDown?.(e);
    },
    [
      scope,
      onArrowDown,
      onArrowUp,
      onArrowLeft,
      onArrowRight,
      onPageDown,
      onPageUp,
      onHome,
      onEnd,
      onEnter,
      onEscape,
      onKeyDown,
    ],
  );

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!pullbackOnBlank) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // 點到 focusable 子元素 → 不攔、讓它正常接 focus
      const focusable = target.closest(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]):not([data-fl-sentinel])',
      );
      const container = innerRef.current;
      if (
        focusable &&
        container &&
        container.contains(focusable) &&
        focusable !== container
      ) {
        return;
      }
      // 點到容器空白（非 focusable）→ preventDefault 阻止 focus 飄 body + 拉回容器
      e.preventDefault();
      container?.focus();
    },
    [pullbackOnBlank],
  );

  return (
    <div
      ref={innerRef}
      tabIndex={tabIndex}
      role={role}
      aria-label={ariaLabel}
      className={cn('outline-none', className)}
      onKeyDown={handleKey}
      onMouseDown={handleMouseDown}
      data-focus-zone
    >
      {children}
    </div>
  );
});
