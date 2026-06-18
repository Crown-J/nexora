// apps/nx-ui/src/features/nx01/shell/master-nav/MasterQuickNav.tsx
// 2026-06-18 主檔快速入口 bar（執行長要求 v2 範式：）
//   - 一次只顯示一個分組（例：組織架構 4 個 icon）
//   - 頭尾翻頁按鈕切換分組（← 上個分組 / 下個分組 →）
//   - icon 按鈕 only、hover 顯主檔名稱 (title attribute / tooltip)
//   - 當前頁的 icon 變色提示（gold）
//   - 走 tryNavigate 給全域 dirty guard 攔
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@design/utils/cn';
import { tryNavigate } from '@design/hooks/useDirtyGuard';

import {
  MASTER_CATEGORIES,
  MASTER_PAGES,
  categoryOfPageId,
  type MasterPageCategory,
  type MasterPageMeta,
} from './master-pages';

export function MasterQuickNav({
  currentPageId,
}: {
  currentPageId?: string | null;
}) {
  // 起始顯示的分組 = 當前頁所屬分組（找不到則 'org'）
  const defaultCategory: MasterPageCategory = useMemo(
    () => categoryOfPageId(currentPageId) ?? 'org',
    [currentPageId],
  );
  const [activeCategory, setActiveCategory] = useState<MasterPageCategory>(defaultCategory);

  // 當外部 currentPageId 變化（例如跨頁跳轉）→ 同步切到對應分組
  useEffect(() => {
    setActiveCategory(defaultCategory);
  }, [defaultCategory]);

  const idx = MASTER_CATEGORIES.findIndex((c) => c.key === activeCategory);
  const prevIdx = idx > 0 ? idx - 1 : -1;
  const nextIdx = idx < MASTER_CATEGORIES.length - 1 ? idx + 1 : -1;
  const cat = MASTER_CATEGORIES[idx];
  const pages = MASTER_PAGES.filter((p) => p.category === cat.key);

  return (
    <div className="inline-flex items-center gap-1.5 rounded-[11px] border border-border/40 bg-background/40 px-1.5 py-[3px]">
      <ArrowButton
        side="left"
        disabled={prevIdx < 0}
        onClick={() => prevIdx >= 0 && setActiveCategory(MASTER_CATEGORIES[prevIdx].key)}
        hint={prevIdx >= 0 ? `上一組：${MASTER_CATEGORIES[prevIdx].label}` : undefined}
      />
      <span className="shrink-0 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
        {cat.label}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        {pages.map((p) => (
          <PageIconButton
            key={p.id}
            page={p}
            active={p.id === currentPageId}
          />
        ))}
      </div>
      <ArrowButton
        side="right"
        disabled={nextIdx < 0}
        onClick={() => nextIdx >= 0 && setActiveCategory(MASTER_CATEGORIES[nextIdx].key)}
        hint={nextIdx >= 0 ? `下一組：${MASTER_CATEGORIES[nextIdx].label}` : undefined}
      />
    </div>
  );
}

function PageIconButton({ page, active }: { page: MasterPageMeta; active: boolean }) {
  const router = useRouter();
  const Icon = page.icon;
  const className = cn(
    'group relative inline-flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors',
    page.disabled
      ? 'cursor-not-allowed border-border/30 bg-background/30 text-muted-foreground/40'
      : active
        ? 'border-[#E8A020]/60 bg-[#E8A020]/15 text-[#E8A020] shadow-[0_0_8px_rgba(232,160,32,0.25)]'
        : 'border-border/40 bg-background/40 text-muted-foreground hover:border-[#E8A020]/40 hover:bg-[#E8A020]/10 hover:text-[#E8A020]',
  );

  if (page.disabled) {
    return (
      <span className={className} title={`${page.label}（待實作）`}>
        <Icon className="size-[15px]" />
      </span>
    );
  }

  return (
    <Link
      href={page.href}
      title={page.label}
      aria-label={page.label}
      className={className}
      onClick={(e) => {
        if (active) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        tryNavigate(() => router.push(page.href));
      }}
    >
      <Icon className="size-[15px]" />
      {/* hover tooltip（fallback、native title 已可、額外做視覺強化） */}
      <span className="pointer-events-none absolute -bottom-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border/60 bg-background/95 px-2 py-1 text-[10.5px] font-medium text-foreground shadow-md group-hover:block">
        {page.label}
      </span>
    </Link>
  );
}

function ArrowButton({
  side,
  disabled,
  onClick,
  hint,
}: {
  side: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
  hint?: string;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      aria-label={hint ?? (side === 'left' ? '上一組' : '下一組')}
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
