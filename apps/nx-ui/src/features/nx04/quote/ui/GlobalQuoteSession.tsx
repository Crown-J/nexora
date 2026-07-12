// apps/nx-ui/src/features/nx04/quote/ui/GlobalQuoteSession.tsx
// F2 全域 hotkey → 即時報價工作台（執行長 2026-07-12 深夜拍板・A/B/C 三區五階段版）
//   工作台本體在 QuoteWorkspace.tsx；本檔只管 F2 開關。
//   開著時再按 F2 不 toggle 關（報價清單是工作狀態、誤觸不能丟）——關閉走 Esc/X 的確認守門。
//   歷史：07-11 夜 v1 獨立對話框 → 07-12 v2 三窗疊層 → 07-12 深夜 v3 工作台（本版）。
'use client';

import { useEffect, useState } from 'react';

import { QuoteWorkspace } from './QuoteWorkspace';

export function GlobalQuoteSession() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => v || true); // 只開不關
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  if (!open) return null;
  return <QuoteWorkspace onClose={() => setOpen(false)} />;
}
