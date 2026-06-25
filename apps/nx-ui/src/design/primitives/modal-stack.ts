// apps/nx-ui/src/design/primitives/modal-stack.ts
// 全站彈出層焦點地基（軌 A、執行長 2026-06-24 拍板方案 A）
//
// 機制：
//   1. 每個 FocusLockedDialog mount 時 push layer DOM 進全域 stack、unmount 時 pop
//   2. DashboardShell mount 時 install 一支 capture-phase keydown guard：
//      · stack 非空 && event.target 不在最上層 layer 內 → stopImmediatePropagation
//      · 把背景頁 21 處的 window.addEventListener('keydown') 全部隔離掉
//      · 背景頁「零修改」（驗收條件 3）
//   3. 多層彈窗時、只有最上層 layer 收鍵盤；Esc 由 layer 自己 handle、逐層回退
//
// 為何 stopImmediatePropagation：
//   背景頁多半是 bubble phase + window.addEventListener、stopPropagation 不夠（同 phase 的後續
//   listener 仍會跑）。stopImmediatePropagation 才能斷後。capture phase 的本 guard 在所有
//   bubble phase listener 之前執行、抓得到所有事件。
'use client';

import { useEffect } from 'react';

type Layer = {
  id: number;
  element: HTMLElement;
  // 開啟前的 focused element、close 時還原
  prevFocus: HTMLElement | null;
  // 是否允許背景 click outside 關（layer-locked: false 時點 backdrop 不關）
  allowBackdropClose: boolean;
  // 給 layer 自己的 Esc handler（layer 元件決定要不要關）
  onEscape?: () => void;
};

const stack: Layer[] = [];
let nextId = 1;
let guardInstalled = false;

/** 給 FocusLockedDialog 內部用 */
export function pushLayer(input: Omit<Layer, 'id'>): number {
  const id = nextId++;
  stack.push({ id, ...input });
  return id;
}

export function popLayer(id: number): Layer | null {
  const idx = stack.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  const [removed] = stack.splice(idx, 1);
  return removed;
}

export function topLayer(): Layer | null {
  return stack.length === 0 ? null : stack[stack.length - 1];
}

export function isTopLayer(id: number): boolean {
  return stack.length > 0 && stack[stack.length - 1].id === id;
}

export function modalStackSize(): number {
  return stack.length;
}

/**
 * 雙重 guard 必要性說明（執行長 2026-06-24 拍板方案 A）：
 *
 *   背景頁 21 處用 `window.addEventListener('keydown', ...)` 都是 bubble phase。
 *   事件 bubble 路徑是 target → ... → react root → ... → document → window。
 *   如果只用 capture phase guard、layer 內事件 target 在 layer 內、capture 放行 →
 *   React handler 跑完後事件仍會 bubble 到 window、背景 listener 仍接到 → 穿透！
 *
 *   ➜ 解法：document 上裝兩支 guard：
 *      A. captureGuard（capture phase）：target 不在 layer 內 → 截斷（保護 layer 外 input 等場景）
 *      B. bubbleGuard（bubble phase）：target 在 layer 內 → 截斷 bubble 繼續傳到 window
 *
 *   兩支夾擊後：背景 window listener 0 機率收到事件。React handler 不受影響
 *   （React 在 root level capture+bubble 接事件、root 在 document 內側、bubbleGuard 在 root 之後跑）。
 */

/** Capture phase：擋「target 不在 layer 內」事件、避免外面元素亂收（如 Tab 跑出 layer 後鍵盤動作） */
function captureGuard(e: KeyboardEvent) {
  if (stack.length === 0) return;
  const top = stack[stack.length - 1];
  const target = e.target as Node | null;
  if (target && top.element.contains(target)) {
    // target 在最上層 layer 內 → capture 放行（讓 React handler 跑）
    return;
  }
  // target 不在最上層 layer 內 → 截斷
  e.stopImmediatePropagation();
  e.stopPropagation();
  if (e.key !== 'F12' && e.key !== 'Tab') {
    // Tab 由 sentinel 接、F12 留給 devtools；其他鍵把焦點拉回 layer 首個 focusable
    focusFirstWithin(top.element);
  }
}

/** Bubble phase：擋「target 在 layer 內」事件 bubble 到 window；React handler 已跑完 */
function bubbleGuard(e: KeyboardEvent) {
  if (stack.length === 0) return;
  const top = stack[stack.length - 1];
  const target = e.target as Node | null;
  if (!target || !top.element.contains(target)) return;
  // 在 layer 內：bubble 已經走完 React root（React handler 已 dispatch 完）、攔下繼續傳到 window
  e.stopImmediatePropagation();
  e.stopPropagation();
}

/** 焦點 trap helper：拉回 layer 首個 focusable */
export function focusFirstWithin(el: HTMLElement) {
  const target = findFirstFocusable(el) ?? el;
  // 用 microtask 確保 React 內部 setState 完成
  queueMicrotask(() => target.focus());
}

export function focusLastWithin(el: HTMLElement) {
  const target = findLastFocusable(el) ?? el;
  queueMicrotask(() => target.focus());
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"]):not([data-fl-sentinel])',
  '[contenteditable="true"]',
].join(',');

export function findFirstFocusable(el: HTMLElement): HTMLElement | null {
  return el.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
}

export function findLastFocusable(el: HTMLElement): HTMLElement | null {
  const list = el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return list.length > 0 ? list[list.length - 1] : null;
}

/** 給 DashboardShell mount 時呼叫一次（idempotent）*/
export function useModalStackGuard(): void {
  useEffect(() => {
    if (guardInstalled) return;
    guardInstalled = true;
    document.addEventListener('keydown', captureGuard, true);
    document.addEventListener('keydown', bubbleGuard, false);
    return () => {
      document.removeEventListener('keydown', captureGuard, true);
      document.removeEventListener('keydown', bubbleGuard, false);
      guardInstalled = false;
    };
  }, []);
}

/** debug：給 devtools 用 */
export function _peekStack(): Layer[] {
  return stack.slice();
}
