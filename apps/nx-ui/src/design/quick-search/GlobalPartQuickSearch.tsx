// apps/nx-ui/src/design/quick-search/GlobalPartQuickSearch.tsx
// F2 全域 hotkey + Modal 掛載點（執行長 2026-06-17 拍板）
//
// 範式：掛在 dashboard/layout.tsx 一次、所有 dashboard 子頁共享。
// F2 toggle 開關、Esc 由 Modal 內部處理。
// 關閉時延遲 200ms 等動畫播完再 unmount（zoom-out 視覺）。
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { PartQuickSearchModal } from './PartQuickSearchModal';

const CLOSE_ANIMATION_MS = 200;

export function GlobalPartQuickSearch() {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setClosing(false);
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    if (!mounted || closing) return;
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setMounted(false);
      setClosing(false);
      closeTimerRef.current = null;
    }, CLOSE_ANIMATION_MS);
  }, [mounted, closing]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        if (mounted) close();
        else open();
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [mounted, open, close]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  if (!mounted) return null;
  return <PartQuickSearchModal closing={closing} onClose={close} />;
}
