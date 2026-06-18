// apps/nx-ui/src/features/page-guide/PageGuideHost.tsx
// v1.2 對齊軌 D：設定精靈 host 元件 + 右下「?」按鈕
//
// 用法：每個工作台頁面包一行 <PageGuideHost pageKey="sale.quote" />
//      - 第一次進該頁、若 seen=false → 自動跳 overlay
//      - 右下顯示「?」按鈕、點按重開 overlay

'use client';

import { useEffect, useState } from 'react';

import { PAGE_GUIDES } from './content';
import { usePageGuideContext } from './PageGuideProvider';
import { TutorialOverlay } from './TutorialOverlay';

/** 2026-06-18 跨元件事件名:TopBar 問號按鈕 dispatch、PageGuideHost listen 開 overlay */
export const PAGE_GUIDE_OPEN_EVENT = 'nx:page-guide-open';

interface Props {
  pageKey: string;
}

export function PageGuideHost({ pageKey }: Props) {
  const ctx = usePageGuideContext();
  const content = PAGE_GUIDES[pageKey];
  const [forceOpen, setForceOpen] = useState(false);

  // 2026-06-18 TopBar 問號按鈕觸發:listen CustomEvent → setForceOpen(true)
  useEffect(() => {
    const onOpen = () => setForceOpen(true);
    window.addEventListener(PAGE_GUIDE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(PAGE_GUIDE_OPEN_EVENT, onOpen);
  }, []);

  const autoOpen = !ctx.loading && !ctx.seenSet.has(pageKey);
  const open = autoOpen || forceOpen;

  // 不存在的 pageKey 不渲染（避免錯字導致 silent failure 沒 overlay）
  if (!content) return null;

  const handleDismiss = () => {
    if (forceOpen) {
      setForceOpen(false);
    } else {
      // 自動跳的、按「我知道了」就標 seen
      void ctx.markSeen(pageKey);
    }
  };

  // 2026-06-18 右下浮動「?」按鈕移除、改走 TopBar 問號按鈕統一觸發
  return open ? <TutorialOverlay content={content} onDismiss={handleDismiss} /> : null;
}
