// apps/nx-ui/src/design/keyboard/GlobalKeymap.tsx
// 全域保留鍵監聽（keymap-registry SSOT 的 go-home 實作；執行長 2026-07-14 拍板）
//
// Home 回首頁：
//   · 焦點守衛 yield-in-input：焦點在輸入欄位 → 讓原生（Home＝跳行首、天天在用的編輯鍵）
//   · 彈窗開著不動作（modal-stack 有層＝使用者在彈窗流程裡、背景換頁只會製造混亂）
//   · 已在首頁 → no-op
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { isEditableTarget } from './keymap-registry';
import { modalStackSize } from '../primitives/modal-stack';

const HOME_PATH = '/dashboard';

export function GlobalKeymap() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Home' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (isEditableTarget(e.target)) return; // 欄位內讓原生跳行首
      if (modalStackSize() > 0) return; // 彈窗流程中不換頁
      if (pathname === HOME_PATH) return;
      e.preventDefault();
      e.stopPropagation();
      router.push(HOME_PATH);
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [router, pathname]);

  return null;
}
