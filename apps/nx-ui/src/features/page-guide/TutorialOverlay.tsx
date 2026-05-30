// apps/nx-ui/src/features/page-guide/TutorialOverlay.tsx
// v1.2 對齊軌 D：設定精靈引導視窗

'use client';

import { useEffect } from 'react';

import type { PageGuideContent } from './content';

interface Props {
  content: PageGuideContent;
  onDismiss: () => void;
}

export function TutorialOverlay({ content, onDismiss }: Props) {
  // ESC 關閉
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-black/30 p-4 pt-24"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl border bg-background shadow-2xl">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{content.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{content.purpose}</p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <section>
            <h3 className="text-sm font-semibold mb-2">主要功能</h3>
            <ol className="ml-4 list-decimal space-y-1.5 text-sm text-foreground">
              {content.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ol>
          </section>

          {content.workflow ? (
            <section className="rounded border bg-muted/30 p-3 text-sm">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-1">操作流程</h3>
              <p className="font-mono text-xs">{content.workflow}</p>
            </section>
          ) : null}

          {content.tip ? (
            <section className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {content.tip}
            </section>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-6 py-3">
          <p className="text-[10px] text-muted-foreground">
            提示：按右下「?」按鈕可隨時重看本引導
          </p>
          <button
            onClick={onDismiss}
            className="rounded bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
          >
            我知道了、開始使用
          </button>
        </div>
      </div>
    </div>
  );
}
