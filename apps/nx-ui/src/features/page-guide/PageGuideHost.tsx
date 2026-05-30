// apps/nx-ui/src/features/page-guide/PageGuideHost.tsx
// v1.2 對齊軌 D：設定精靈 host 元件 + 右下「?」按鈕
//
// 用法：每個工作台頁面包一行 <PageGuideHost pageKey="sale.quote" />
//      - 第一次進該頁、若 seen=false → 自動跳 overlay
//      - 右下顯示「?」按鈕、點按重開 overlay

'use client';

import { HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PAGE_GUIDES } from './content';
import { usePageGuideContext } from './PageGuideProvider';
import { TutorialOverlay } from './TutorialOverlay';

interface Props {
  pageKey: string;
}

export function PageGuideHost({ pageKey }: Props) {
  const ctx = usePageGuideContext();
  const content = PAGE_GUIDES[pageKey];
  const [forceOpen, setForceOpen] = useState(false);

  const autoOpen = !ctx.loading && !ctx.seenSet.has(pageKey);
  const open = autoOpen || forceOpen;

  // 不存在的 pageKey 不渲染（避免錯字導致 silent failure 沒 ? 按鈕也沒 overlay）
  if (!content) return null;

  const handleDismiss = () => {
    if (forceOpen) {
      setForceOpen(false);
    } else {
      // 自動跳的、按「我知道了」就標 seen
      void ctx.markSeen(pageKey);
    }
  };

  const handleReopen = () => {
    setForceOpen(true);
  };

  return (
    <>
      <button
        onClick={handleReopen}
        title={`重看「${content.title}」引導`}
        className="fixed bottom-20 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border bg-background shadow-lg hover:bg-muted"
        aria-label="重看頁面引導"
      >
        <HelpCircle className="h-5 w-5" />
      </button>
      {open ? <TutorialOverlay content={content} onDismiss={handleDismiss} /> : null}
    </>
  );
}
