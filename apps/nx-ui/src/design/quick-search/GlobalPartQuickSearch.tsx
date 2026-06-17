// apps/nx-ui/src/design/quick-search/GlobalPartQuickSearch.tsx
// F2 全域 hotkey + Modal 掛載點（執行長 2026-06-17 拍板）
//
// 範式：掛在 dashboard/layout.tsx 一次、所有 dashboard 子頁共享。
// F2 toggle、Esc 由 Modal 內部處理關閉。
'use client';

import { useCallback, useEffect, useState } from 'react';

import { PartQuickSearchModal } from './PartQuickSearchModal';

export function GlobalPartQuickSearch() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  return <PartQuickSearchModal open={open} onClose={close} />;
}
