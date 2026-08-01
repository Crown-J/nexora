// apps/nx-ui/src/design/navigation/GlobalNineGrid.tsx
//
// 九宮格的全域接線（v3.0.0 階段 1 Step 2）
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §3.1
//
// 職責只有兩件：管開關、把「選到哪」接到「怎麼開」。
// 面板本身（三層、鍵盤、排列）在 NineGrid.tsx，不知道頁面怎麼開——
// Step 3 換新外殼時只要換這裡的 onNavigate，面板一行都不用動。
//
// ⚠️ 暫用 F4，Step 4 才切成 F2：
//   F2 目前是即時工作檯（features/shared/instant-workbench）的鍵，五個站靠它進入。
//   現在搶過來會讓那五站進不去，所以等 Step 4 連站台一起遷移時再換。
//   規格 §3.1 的最終鍵位是 F2。

'use client';

import { useEffect, useState } from 'react';

import { useWorkbenchTabs } from '@design/layout/workbench/WorkbenchTabsContext';

import { NineGrid } from './NineGrid';

/** Step 2 暫代鍵；Step 4 改成 'F2' */
const TOGGLE_KEY = 'F4';

export function GlobalNineGrid() {
  const [open, setOpen] = useState(false);
  const { open: openTab } = useWorkbenchTabs();

  // window capture：搶在頁面與 modal-stack 的 guard 之前（比照即時工作檯既有範式）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== TOGGLE_KEY || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen((v) => !v);
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, []);

  return (
    <NineGrid
      open={open}
      onClose={() => setOpen(false)}
      onNavigate={(href, label) => openTab(href, `九宮格：${label}`)}
    />
  );
}
