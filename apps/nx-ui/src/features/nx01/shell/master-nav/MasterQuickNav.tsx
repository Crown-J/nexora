// apps/nx-ui/src/features/nx01/shell/master-nav/MasterQuickNav.tsx
// 2026-06-18 主檔快速入口 bar
//   - 6 分區 × 22 chip（demo 列 25 中 3 個 disabled）
//   - 橫向滾動、頭尾翻頁按鈕
//   - currentPageId 標亮金色
//   - 走 tryNavigate 給全域 dirty guard 攔
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@design/utils/cn';
import { tryNavigate } from '@design/hooks/useDirtyGuard';

import { MASTER_CATEGORIES, MASTER_PAGES, type MasterPageMeta } from './master-pages';

export function MasterQuickNav({
  currentPageId,
}: {
  currentPageId?: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrowStates = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrowStates();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrowStates, { passive: true });
    const ro = new ResizeObserver(updateArrowStates);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateArrowStates);
      ro.disconnect();
    };
  }, [updateArrowStates]);

  const scrollByAmount = useCallback((delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  return (
    <div className="flex items-center gap-1">
      <ArrowButton
        side="left"
        disabled={!canScrollLeft}
        onClick={() => scrollByAmount(-240)}
      />
      <div
        ref={scrollRef}
        className="flex flex-1 items-center gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {MASTER_CATEGORIES.map((cat, i) => {
          const pages = MASTER_PAGES.filter((p) => p.category === cat.key);
          if (pages.length === 0) return null;
          return (
            <div key={cat.key} className="flex items-center gap-1.5">
              {i > 0 ? (
                <span className="h-4 w-px shrink-0 bg-border/50" aria-hidden />
              ) : null}
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                {cat.label}
              </span>
              <div className="flex shrink-0 gap-1">
                {pages.map((p) => (
                  <PageChip key={p.id} page={p} active={p.id === currentPageId} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <ArrowButton
        side="right"
        disabled={!canScrollRight}
        onClick={() => scrollByAmount(240)}
      />
    </div>
  );
}

function PageChip({ page, active }: { page: MasterPageMeta; active: boolean }) {
  const router = useRouter();
  const className = cn(
    'inline-flex h-7 shrink-0 items-center rounded-md border px-2.5 text-[11.5px] font-medium transition-colors',
    page.disabled
      ? 'cursor-not-allowed border-border/30 bg-background/30 text-muted-foreground/50'
      : active
        ? 'border-[#E8A020]/50 bg-[#E8A020]/15 text-[#E8A020]'
        : 'border-border/40 bg-background/40 text-foreground/80 hover:border-[#E8A020]/40 hover:bg-[#E8A020]/10 hover:text-[#E8A020]',
  );

  if (page.disabled) {
    return (
      <span className={className} title="待實作">
        {page.label}
      </span>
    );
  }

  return (
    <Link
      href={page.href}
      className={className}
      onClick={(e) => {
        if (active) {
          e.preventDefault();
          return;
        }
        // 走 tryNavigate 給全域 dirty guard 攔
        e.preventDefault();
        tryNavigate(() => router.push(page.href));
      }}
    >
      {page.label}
    </Link>
  );
}

function ArrowButton({
  side,
  disabled,
  onClick,
}: {
  side: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? '往左翻' : '往右翻'}
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors',
        disabled
          ? 'cursor-not-allowed border-border/20 bg-background/20 text-muted-foreground/30'
          : 'border-border/40 bg-background/40 text-muted-foreground hover:border-[#E8A020]/40 hover:bg-[#E8A020]/10 hover:text-[#E8A020]',
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
