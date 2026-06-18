// apps/nx-ui/src/features/nx01/shell/master-nav/MasterQuickNav.tsx
// 2026-06-18 主檔快速入口 bar v3（執行長範式）
//   - 一次顯一個分組、固定 5 slot 寬度（不到 5 個尾部空白）
//   - 按鈕高度 34px、與資料瀏覽 tab 同高
//   - 分組標籤 / chevron 字體 13px、與 tab 同字大
//   - icon button only、hover 顯主檔名稱
//   - 當前頁 icon 變色提示
//   - 翻頁動畫:右翻 = 舊內容左滑出 / 新內容從右滑入；左翻反之
//   - 走 tryNavigate 給全域 dirty guard 攔
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
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

const SLOT_COUNT = 5;
const SLOT_SIZE = 34; // 與 tab 同高
const SLOT_GAP = 4;

type Direction = 'left' | 'right';

const variants = {
  enter: (dir: Direction) => ({
    x: dir === 'right' ? 40 : -40,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: Direction) => ({
    x: dir === 'right' ? -40 : 40,
    opacity: 0,
  }),
};

export function MasterQuickNav({
  currentPageId,
}: {
  currentPageId?: string | null;
}) {
  const defaultCategory: MasterPageCategory = useMemo(
    () => categoryOfPageId(currentPageId) ?? 'org',
    [currentPageId],
  );
  const [activeCategory, setActiveCategory] = useState<MasterPageCategory>(defaultCategory);
  const [direction, setDirection] = useState<Direction>('right');

  // 當外部 currentPageId 變化（跨頁跳轉）→ 同步切到對應分組
  useEffect(() => {
    setActiveCategory(defaultCategory);
  }, [defaultCategory]);

  const idx = MASTER_CATEGORIES.findIndex((c) => c.key === activeCategory);
  const prevIdx = idx > 0 ? idx - 1 : -1;
  const nextIdx = idx < MASTER_CATEGORIES.length - 1 ? idx + 1 : -1;
  const cat = MASTER_CATEGORIES[idx];
  const pages = MASTER_PAGES.filter((p) => p.category === cat.key);

  // 固定 5 slot、不足補 null placeholder
  const slots: (MasterPageMeta | null)[] = [...pages];
  while (slots.length < SLOT_COUNT) slots.push(null);

  const slotsTotalWidth = SLOT_COUNT * SLOT_SIZE + (SLOT_COUNT - 1) * SLOT_GAP;

  const handlePrev = () => {
    if (prevIdx < 0) return;
    setDirection('left');
    setActiveCategory(MASTER_CATEGORIES[prevIdx].key);
  };
  const handleNext = () => {
    if (nextIdx < 0) return;
    setDirection('right');
    setActiveCategory(MASTER_CATEGORIES[nextIdx].key);
  };

  return (
    <div className="inline-flex items-center gap-1.5 self-start rounded-[11px] border border-border/40 bg-background/40 p-[3px]">
      <ArrowButton
        side="left"
        disabled={prevIdx < 0}
        onClick={handlePrev}
        hint={prevIdx >= 0 ? `上一組：${MASTER_CATEGORIES[prevIdx].label}` : undefined}
      />
      <div className="relative overflow-hidden" style={{ height: SLOT_SIZE }}>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={cat.key}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex items-center"
            style={{ gap: SLOT_GAP, width: slotsTotalWidth + 80 }}
          >
            <span className="shrink-0 pr-1 text-[13px] font-semibold text-foreground/85">
              {cat.label}
            </span>
            {slots.map((p, i) =>
              p ? (
                <PageIconButton key={p.id} page={p} active={p.id === currentPageId} />
              ) : (
                <span
                  key={`empty-${i}`}
                  aria-hidden
                  className="shrink-0"
                  style={{ width: SLOT_SIZE, height: SLOT_SIZE }}
                />
              ),
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <ArrowButton
        side="right"
        disabled={nextIdx < 0}
        onClick={handleNext}
        hint={nextIdx >= 0 ? `下一組：${MASTER_CATEGORIES[nextIdx].label}` : undefined}
      />
    </div>
  );
}

function PageIconButton({ page, active }: { page: MasterPageMeta; active: boolean }) {
  const router = useRouter();
  const Icon = page.icon;
  const className = cn(
    'group relative inline-flex shrink-0 items-center justify-center rounded-md border transition-colors',
    page.disabled
      ? 'cursor-not-allowed border-border/30 bg-muted/20 text-muted-foreground/40'
      : active
        ? 'border-primary/60 bg-primary/15 text-primary shadow-[0_0_8px_color-mix(in_srgb,var(--color-primary)_30%,transparent)]'
        : 'border-border/50 bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
  );
  const sizeStyle = { width: SLOT_SIZE, height: SLOT_SIZE };

  if (page.disabled) {
    return (
      <span className={className} title={`${page.label}（待實作）`} style={sizeStyle}>
        <Icon className="size-[17px]" />
      </span>
    );
  }

  return (
    <Link
      href={page.href}
      title={page.label}
      aria-label={page.label}
      className={className}
      style={sizeStyle}
      onClick={(e) => {
        if (active) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        tryNavigate(() => router.push(page.href));
      }}
    >
      <Icon className="size-[17px]" />
      <span className="pointer-events-none absolute -bottom-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border/60 bg-background/95 px-2 py-1 text-[11px] font-medium text-foreground shadow-md group-hover:block">
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
        'inline-flex shrink-0 items-center justify-center rounded-md border transition-colors',
        disabled
          ? 'cursor-not-allowed border-border/30 bg-muted/20 text-muted-foreground/30'
          : 'border-border/50 bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
      )}
      style={{ width: SLOT_SIZE, height: SLOT_SIZE }}
    >
      <Icon className="size-4" />
    </button>
  );
}
