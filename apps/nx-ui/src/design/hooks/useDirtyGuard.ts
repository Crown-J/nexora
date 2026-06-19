// apps/nx-ui/src/design/hooks/useDirtyGuard.ts
// 全域 dirty 攔截器（Phase 2 後續軌、執行長 2026-06-17 拍板）
//
// 用途：頁面進入編輯模式且 dirty 時、跨頁跳轉前先 prompt user。
// Next.js App Router 沒原生 router.events API、改 module-level ref 模式。
//
// 使用範式：
//   // Page 註冊（卸載自動清）
//   useDirtyGuard(
//     () => mode === 'edit' && isDirty,
//     useCallback((proceed) => {
//       setConfirm({
//         title: '尚有未儲存的變更',
//         confirmLabel: '存檔後離開',
//         onConfirm: () => { void performSave(); proceed(); },
//         secondaryAction: { label: '丟棄變更', variant: 'danger', onClick: () => { performCancel(); proceed(); } },
//       });
//     }, [setConfirm, performSave, performCancel]),
//   );
//
//   // 跳轉 caller（UnifiedTopBar / PlanetDock / 內部跳轉）
//   onClick={() => tryNavigate(() => router.push(href))}
//
// 範圍：client-side router.push 攔截 + beforeunload 瀏覽器層攔截兩件齊。

'use client';

import { useEffect, useRef } from 'react';

type DirtyGuardEntry = {
  isDirty: () => boolean;
  confirmAndProceed: (proceed: () => void) => void;
};

const guardRef: { current: DirtyGuardEntry | null } = { current: null };

/**
 * Page 註冊 dirty guard（mount 時 set、unmount 時 clear）。
 * 同時掛 beforeunload listener（瀏覽器層、關分頁/上一頁/F5 仍會問）。
 *
 * @param isDirty 回傳當前是否有未儲存變更
 * @param confirmAndProceed 觸發自訂 prompt UI、user 確認後 call proceed()
 */
export function useDirtyGuard(
  isDirty: () => boolean,
  confirmAndProceed: (proceed: () => void) => void,
): void {
  const isDirtyRef = useRef(isDirty);
  const confirmRef = useRef(confirmAndProceed);

  // 每次 render 同步最新 callable 進 ref（避免 closure stale）
  useEffect(() => {
    isDirtyRef.current = isDirty;
  });
  useEffect(() => {
    confirmRef.current = confirmAndProceed;
  });

  useEffect(() => {
    const entry: DirtyGuardEntry = {
      isDirty: () => isDirtyRef.current(),
      confirmAndProceed: (proceed) => confirmRef.current(proceed),
    };
    guardRef.current = entry;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      // 只清自己註冊的（防後註冊頁 unmount 時誤清前一頁）
      if (guardRef.current === entry) guardRef.current = null;
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);
}

/**
 * 跳轉前檢查 dirty:
 *  - 若 dirty 觸發 confirmAndProceed（由 page 提供自訂 prompt 如 3-way confirm）
 *  - 否則執行 navigateWithScatter（散開動畫完成才實際 router.push）
 *
 * Usage: tryNavigate(() => router.push('/dashboard/xxx'))
 */
export function tryNavigate(navigate: () => void, label?: string): void {
  console.debug('[NX-NAV] tryNavigate', label ?? '(no label)');
  const wrapped = () => navigateWithScatter(navigate, label);
  const g = guardRef.current;
  if (g && g.isDirty()) {
    console.debug('[NX-NAV] dirty guard：confirmAndProceed', label);
    g.confirmAndProceed(wrapped);
  } else {
    wrapped();
  }
}

// ──────────────────────────────────────────────────────────────
// 2026-06-19 階段 2:ScatterPageGate 註冊 scatter exit 動畫
//   tryNavigate 跑完 dirty check 後、會先跑 scatter（散開）完成才 navigate
//   未註冊（如 layout 還沒 mount）時 fallback 直接 navigate（不影響功能）
// ──────────────────────────────────────────────────────────────

type ScatterNavigate = (navigate: () => void, label?: string) => void;
let scatterImpl: ScatterNavigate | null = null;

/**
 * 由 ScatterPageGate mount 時呼叫、註冊全域 scatter exit 動畫實作。
 * 回傳 unregister 函式（unmount 時 cleanup）。
 */
export function registerScatterNavigate(impl: ScatterNavigate): () => void {
  scatterImpl = impl;
  return () => {
    if (scatterImpl === impl) scatterImpl = null;
  };
}

function navigateWithScatter(navigate: () => void, label?: string): void {
  if (scatterImpl) {
    scatterImpl(navigate, label);
  } else {
    console.debug('[NX-NAV] no scatter impl, direct navigate', label);
    navigate();
  }
}
