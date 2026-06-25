// apps/nx-ui/src/design/components/quick-search/GlobalPartQuickSearch.tsx
// F2 全域 hotkey + 視窗 1（搜尋窗）/ 視窗 2（主視窗）管理（執行長 2026-06-25 視窗 2 任務單）
//
// 流程：
//   1. F2 → 搜尋窗開
//   2. 搜尋窗 Enter selectRow → dispatch `nx-part-selected` event；搜尋窗仍 mounted
//   3. 本元件接 event → setMainPartId、PartMainWindow 開（疊在搜尋窗上）
//   4. 主視窗 Esc/退回搜尋 → setMainPartId(null)、自動回搜尋窗（搜尋條件保留）
//   5. 主視窗 X 全關 → 兩窗都關
//
// modal-stack 自動管理：主窗在搜尋窗之上、guard 隔離背景、Esc 逐層回退
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { PartMainWindow } from './PartMainWindow';
import { PartQuickSearchModal } from './PartQuickSearchModal';

const CLOSE_ANIMATION_MS = 200;

type PartSelectedDetail = {
  partId: string;
  code?: string;
  name?: string;
};

export function GlobalPartQuickSearch() {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  // 視窗 2：主視窗的 partId（null = 主視窗未開）
  const [mainPartId, setMainPartId] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setClosing(false);
    setMounted(true);
  }, []);

  const closeAll = useCallback(() => {
    if (!mounted || closing) return;
    setMainPartId(null);
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setMounted(false);
      setClosing(false);
      closeTimerRef.current = null;
    }, CLOSE_ANIMATION_MS);
  }, [mounted, closing]);

  // F2 toggle：若主視窗開、F2 先關主視窗回搜尋窗；否則 toggle 搜尋窗
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        if (mainPartId) {
          // 主視窗開著 F2 → 回搜尋窗
          setMainPartId(null);
        } else if (mounted) {
          closeAll();
        } else {
          open();
        }
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [mounted, mainPartId, open, closeAll]);

  // 接搜尋窗的 nx-part-selected event → 開主視窗
  useEffect(() => {
    if (!mounted) return;
    const h = (e: Event) => {
      const ce = e as CustomEvent<PartSelectedDetail>;
      const id = ce.detail?.partId;
      if (typeof id === 'string' && id) {
        setMainPartId(id);
      }
    };
    window.addEventListener('nx-part-selected', h);
    return () => window.removeEventListener('nx-part-selected', h);
  }, [mounted]);

  // 主視窗退回搜尋窗（保留搜尋窗 state）
  const backToSearch = useCallback(() => {
    setMainPartId(null);
  }, []);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  if (!mounted) return null;
  return (
    <>
      <PartQuickSearchModal closing={closing} onClose={closeAll} />
      {mainPartId && (
        <PartMainWindow partId={mainPartId} onBack={backToSearch} onClose={closeAll} />
      )}
    </>
  );
}
