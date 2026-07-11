// apps/nx-ui/src/features/nx04/quote/ui/GlobalQuoteSession.tsx
// F2 全域 hotkey → 即時報價查詢工作台（執行長 2026-07-11 夜拍板・F1/F2 分流）
//   F1 = 即時庫存查詢（design/quick-search、原 F2 整組）；F2 = 本檔（客戶錨定連續報價）。
//   開著時再按 F2 不 toggle 關（報價清單是工作狀態、誤觸不能丟）——關閉走 Esc/X 的確認守門。
'use client';

import { useEffect, useState } from 'react';

import { QuoteSessionDialog } from './QuoteSessionDialog';

export function GlobalQuoteSession() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => v || true); // 只開不關：關閉走對話框內的守門（未存清單要確認）
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  if (!open) return null;
  return <QuoteSessionDialog onClose={() => setOpen(false)} />;
}
