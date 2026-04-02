/**
 * 主檔置中明細彈窗：遮罩 + glass aside + 標題列（上一筆／下一筆／全螢幕／關閉）。
 * 與 BaseUserMasterView／BaseRoleMasterView／BasePartMasterView 共用版型。
 */

'use client';

import type { RefObject, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type BaseMasterModalFrameProps = {
  open: boolean;
  detailPanelRef: RefObject<HTMLElement | null>;
  detailFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
  titleId: string;
  /** 小標，預設「DETAIL」 */
  detailEyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode | null;
  showPrevNext: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  disablePrev?: boolean;
  disableNext?: boolean;
  children: ReactNode;
};

export function BaseMasterModalFrame({
  open,
  detailPanelRef,
  detailFullscreen,
  onToggleFullscreen,
  onClose,
  titleId,
  detailEyebrow = 'DETAIL',
  title,
  subtitle,
  showPrevNext,
  onPrev,
  onNext,
  disablePrev,
  disableNext,
  children,
}: BaseMasterModalFrameProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/55 backdrop-blur-[2px] dark:bg-background/70"
        aria-hidden
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClose();
          }
        }}
        role="button"
        tabIndex={-1}
      />

      <aside
        ref={detailPanelRef}
        className={cn(
          'glass-card nx-glass-raised fixed left-1/2 top-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border/80 shadow-2xl transition-[width,max-height] duration-200 ease-out',
          detailFullscreen
            ? 'h-[min(90dvh,calc(100dvh-1.5rem))] w-[min(92vw,calc(100vw-1rem))]'
            : 'max-h-[min(85dvh,calc(100dvh-2rem))] w-[min(80vw,calc(100vw-1.5rem))]',
        )}
        aria-modal="true"
        role="dialog"
        aria-labelledby={titleId}
      >
        <div
          className={cn(
            'nx-master-modal-scroll flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-6',
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs tracking-[0.35em] text-muted-foreground">{detailEyebrow}</p>
                <h2 id={titleId} className="mt-0.5 truncate text-base font-semibold text-foreground">
                  {title}
                </h2>
                {subtitle != null ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {showPrevNext ? (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="inline-flex size-8"
                    aria-label="上一筆"
                    disabled={disablePrev}
                    onClick={onPrev}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="inline-flex size-8"
                    aria-label="下一筆"
                    disabled={disableNext}
                    onClick={onNext}
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
                aria-label={detailFullscreen ? '恢復預設視窗大小' : '放大視窗'}
                title={detailFullscreen ? '恢復預設視窗大小' : '放大視窗'}
                onClick={onToggleFullscreen}
              >
                {detailFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </Button>
              <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="關閉詳情" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {children}
        </div>
      </aside>
    </>
  );
}
