/**
 * File: apps/nx-ui/src/features/base/shell/BaseMasterSlideAside.tsx
 *
 * Purpose:
 * - LIST+SLIDE 明細浮層（與 /base/user、職務主檔一致）：遮罩、全螢幕、Esc、上一筆／下一筆
 */

'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function useMasterSlideDetailEffects(
  panelOpen: boolean,
  closeDetailFull: () => void,
  detailFullscreen: boolean,
  setDetailFullscreen: (v: boolean | ((b: boolean) => boolean)) => void,
  resetFullscreenDeps: unknown[],
) {
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      closeDetailFull();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen, closeDetailFull]);

  useEffect(() => {
    setDetailFullscreen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依選取列／新增狀態重設全螢幕
  }, resetFullscreenDeps);
}

export type BaseMasterSlideAsideProps = {
  open: boolean;
  detailFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
  titleId: string;
  title: ReactNode;
  subtitle?: ReactNode;
  navPrev?: { onClick: () => void; disabled: boolean };
  navNext?: { onClick: () => void; disabled: boolean };
  children: ReactNode;
  footer: ReactNode;
};

export function BaseMasterSlideAside({
  open,
  detailFullscreen,
  onToggleFullscreen,
  onClose,
  titleId,
  title,
  subtitle,
  navPrev,
  navNext,
  children,
  footer,
}: BaseMasterSlideAsideProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/55 backdrop-blur-[2px] dark:bg-background/70"
        aria-hidden
        onClick={onClose}
        role="button"
        tabIndex={-1}
      />

      <aside
        className={cn(
          'glass-card flex flex-col overflow-y-auto overscroll-contain border-border/80 bg-background shadow-2xl transition-[transform,opacity,box-shadow] duration-300 ease-out',
          detailFullscreen
            ? 'fixed left-1/2 top-1/2 z-50 w-[min(92vw,42rem)] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border shadow-2xl max-h-[min(85dvh,calc(100dvh-3.5rem-6.5rem))] sm:w-[min(90vw,48rem)]'
            : 'fixed inset-0 z-50 max-h-[100dvh] rounded-none border-0 max-lg:border-0 lg:inset-auto lg:right-4 lg:top-24 lg:bottom-4 lg:left-auto lg:h-auto lg:max-h-[calc(100vh-7rem)] lg:w-[min(440px,calc(100vw-2rem))] lg:rounded-2xl lg:border lg:shadow-2xl',
        )}
        aria-modal="true"
        role="dialog"
        aria-labelledby={titleId}
      >
        <div
          className={cn(
            'flex min-w-0 flex-col',
            'min-h-0 flex-1 p-4 pt-[max(0.75rem,env(safe-area-inset-top))] lg:pt-4',
            detailFullscreen &&
              'w-full max-w-none px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6',
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border/60 pb-3 lg:border-0 lg:pb-0">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="shrink-0 lg:hidden"
                aria-label="返回列表"
                onClick={onClose}
              >
                <ArrowLeft className="size-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="text-xs tracking-[0.35em] text-muted-foreground">DETAIL</p>
                <h2 id={titleId} className="mt-0.5 truncate text-base font-semibold text-foreground lg:text-sm">
                  {title}
                </h2>
                {subtitle ? <div className="truncate text-xs text-muted-foreground">{subtitle}</div> : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {navPrev && navNext ? (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="hidden size-8 lg:inline-flex"
                    aria-label="上一筆"
                    disabled={navPrev.disabled}
                    onClick={navPrev.onClick}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="hidden size-8 lg:inline-flex"
                    aria-label="下一筆"
                    disabled={navNext.disabled}
                    onClick={navNext.onClick}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="inline-flex size-8"
                aria-label={detailFullscreen ? '結束全螢幕' : '全螢幕明細'}
                onClick={onToggleFullscreen}
              >
                {detailFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </Button>
              <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="關閉" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {children}

          {footer}
        </div>
      </aside>
    </>
  );
}
