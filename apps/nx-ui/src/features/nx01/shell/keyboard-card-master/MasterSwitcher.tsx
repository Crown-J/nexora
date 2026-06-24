// apps/nx-ui/src/features/nx01/shell/keyboard-card-master/MasterSwitcher.tsx
/**
 * MasterSwitcher — 主檔快速切換器（M 鍵叫出、卡片式 + 全鍵盤）
 *
 * 2026-06-24 第二版（執行長拍板修四件）：
 *   1. 移除搜尋框（22 個主檔不需要 fuzzy、視覺也乾淨）
 *   2. 鍵盤 capture 改 root div tabIndex=-1 + onKeyDown
 *      → 不依賴 input focus、點擊卡片後 refocus root 鍵盤永遠通
 *   3. 滾動容器 overflow-y: scroll 永遠保留 scrollbar + 自訂細條
 *      → 徹底治 scrollbar 出現 / 消失閃爍
 *   4. 排版精修：modal 收窄 max-w-2xl、4 欄固定 grid、卡片統一高、
 *      分區標題加 count chip、border / spacing / radius 統一
 *
 * 共用：吃既有 MASTER_PAGES / MASTER_CATEGORIES / tryNavigate（不擴 registry）。
 */
'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as RKeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@design/utils/cn';
import { tryNavigate } from '@design/hooks/useDirtyGuard';
import { useReducedMotion } from '@/design/motion/gsap';

import {
  MASTER_CATEGORIES,
  MASTER_PAGES,
  type MasterPageMeta,
} from '@/features/nx01/shell/master-nav/master-pages';

type Props = {
  open: boolean;
  currentPageId?: string | null;
  onClose: () => void;
};

export function MasterSwitcher({ open, currentPageId, onClose }: Props) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [focusIdx, setFocusIdx] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 平鋪可用主檔（非 disabled）— 22 個固定
  const all = useMemo<MasterPageMeta[]>(
    () => MASTER_PAGES.filter((p) => !p.disabled),
    [],
  );

  // 依分區 group（保留分區順序）
  const grouped = useMemo(
    () =>
      MASTER_CATEGORIES.map((cat) => ({
        cat,
        pages: all.filter((p) => p.category === cat.key),
      })).filter((g) => g.pages.length > 0),
    [all],
  );

  // ── 開啟：focus root（不是 input）+ focusIdx 對齊當前主檔 ──
  useEffect(() => {
    if (!open) return;
    const idx = all.findIndex((p) => p.id === currentPageId);
    setFocusIdx(idx >= 0 ? idx : 0);
    const t = setTimeout(() => rootRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open, all, currentPageId]);

  // ── 方向鍵：用 bounding rect 算上下左右 ──
  const moveFocus = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right') => {
      const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
      if (cards.length === 0) return;
      const curr = cards[focusIdx]?.getBoundingClientRect();
      if (!curr) return;
      const cx = curr.left + curr.width / 2;
      const cy = curr.top + curr.height / 2;
      let best = focusIdx;
      let bestDist = Infinity;
      for (let i = 0; i < cards.length; i++) {
        if (i === focusIdx) continue;
        const r = cards[i].getBoundingClientRect();
        const rx = r.left + r.width / 2;
        const ry = r.top + r.height / 2;
        const dx = rx - cx;
        const dy = ry - cy;
        let primary = 0;
        let secondary = 0;
        if (dir === 'right') {
          if (dx <= 4) continue;
          primary = dx;
          secondary = Math.abs(dy) * 3;
        } else if (dir === 'left') {
          if (dx >= -4) continue;
          primary = -dx;
          secondary = Math.abs(dy) * 3;
        } else if (dir === 'down') {
          if (dy <= 4) continue;
          primary = dy;
          secondary = Math.abs(dx) * 3;
        } else if (dir === 'up') {
          if (dy >= -4) continue;
          primary = -dy;
          secondary = Math.abs(dx) * 3;
        }
        const dist = primary + secondary;
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      if (best !== focusIdx) {
        setFocusIdx(best);
        // 手動 scrollBy（不用 element.scrollIntoView 避免冒泡到 document）
        const target = cards[best];
        const container = scrollContainerRef.current;
        if (target && container) {
          const er = target.getBoundingClientRect();
          const cr = container.getBoundingClientRect();
          const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth';
          if (er.top < cr.top) {
            container.scrollBy({ top: er.top - cr.top - 12, behavior });
          } else if (er.bottom > cr.bottom) {
            container.scrollBy({ top: er.bottom - cr.bottom + 12, behavior });
          }
        }
      }
    },
    [focusIdx, reduced],
  );

  const activate = useCallback(
    (target: MasterPageMeta) => {
      if (target.id === currentPageId) {
        onClose();
        return;
      }
      onClose();
      tryNavigate(
        () => router.push(target.href),
        `master-switcher: ${target.label} → ${target.href}`,
      );
    },
    [currentPageId, onClose, router],
  );

  const handleActivate = useCallback(() => {
    const target = all[focusIdx];
    if (target) activate(target);
  }, [all, focusIdx, activate]);

  // ── root div onKeyDown（不依賴 window listener、不依賴 input focus）──
  const handleKey = (e: RKeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleActivate();
        return;
      case 'ArrowUp':
        e.preventDefault();
        moveFocus('up');
        return;
      case 'ArrowDown':
        e.preventDefault();
        moveFocus('down');
        return;
      case 'ArrowLeft':
        e.preventDefault();
        moveFocus('left');
        return;
      case 'ArrowRight':
        e.preventDefault();
        moveFocus('right');
        return;
      case 'Home':
        e.preventDefault();
        setFocusIdx(0);
        return;
      case 'End':
        e.preventDefault();
        setFocusIdx(Math.max(0, all.length - 1));
        return;
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-background/65 p-6 pt-[10vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.15 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={rootRef}
            tabIndex={-1}
            onKeyDown={handleKey}
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 6 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: [0.2, 0.7, 0.2, 1] }}
            className={cn(
              'w-full max-w-2xl rounded-2xl border bg-card shadow-2xl outline-none',
              'border-[#E8A020]/40 shadow-[#E8A020]/15',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#E8A020]/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#E8A020]">
                  M
                </span>
                <h2 className="text-sm font-semibold tracking-wider text-foreground">
                  切換主檔
                </h2>
              </div>
              <span className="text-[11px] text-muted-foreground">
                共 {all.length} 個
              </span>
            </div>

            {/* Scroll body — 永遠保留 scrollbar、不會閃 */}
            <div
              ref={scrollContainerRef}
              className="ms-scroll max-h-[64vh] overflow-y-scroll px-5 py-4"
            >
              {(() => {
                let flatIdx = 0;
                return grouped.map(({ cat, pages }) => (
                  <section key={cat.key} className="mb-5 last:mb-0">
                    <div className="mb-2.5 flex items-center gap-2">
                      <span className="text-[11px] font-semibold tracking-[0.18em] text-[#E8A020]/80">
                        {cat.label.toUpperCase()}
                      </span>
                      <span className="rounded-full bg-foreground/8 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                        {pages.length}
                      </span>
                      <span className="h-px flex-1 bg-border/30" />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {pages.map((p) => {
                        const idx = flatIdx++;
                        const focused = idx === focusIdx;
                        const current = p.id === currentPageId;
                        const Icon = p.icon;
                        return (
                          <div
                            key={p.id}
                            ref={(el) => {
                              cardRefs.current[idx] = el;
                            }}
                            onClick={() => {
                              setFocusIdx(idx);
                              rootRef.current?.focus();
                            }}
                            onDoubleClick={() => activate(p)}
                            className={cn(
                              'relative cursor-pointer rounded-lg border bg-background/40 px-2.5 py-2.5 transition-colors',
                              'border-border/40 hover:border-[#E8A020]/50 hover:bg-background/60',
                            )}
                          >
                            {focused ? (
                              <motion.span
                                layoutId="master-switcher-ring"
                                className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-[#E8A020] [box-shadow:0_0_0_3px_rgba(232,160,32,0.16)]"
                                transition={
                                  reduced
                                    ? { duration: 0 }
                                    : { type: 'spring', stiffness: 380, damping: 30 }
                                }
                              />
                            ) : null}
                            <div className="relative flex items-center gap-2">
                              <Icon
                                className={cn(
                                  'size-[16px] shrink-0',
                                  current ? 'text-[#E8A020]' : 'text-muted-foreground/80',
                                )}
                              />
                              <span
                                className={cn(
                                  'min-w-0 flex-1 truncate text-[13px] font-medium',
                                  current ? 'text-[#E8A020]' : 'text-foreground/90',
                                )}
                              >
                                {p.label}
                              </span>
                              {current ? (
                                <span className="shrink-0 text-[9px] font-bold tracking-wider text-[#E8A020]">
                                  ●
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                      {/* 補齊 4 欄寬度（讓最後一行對齊） */}
                      {Array.from({ length: (4 - (pages.length % 4)) % 4 }).map((_, i) => (
                        <div key={`pad-${cat.key}-${i}`} aria-hidden />
                      ))}
                    </div>
                  </section>
                ));
              })()}
            </div>

            {/* Footer hints */}
            <div className="flex items-center justify-between border-t border-border/40 px-5 py-2.5 text-[11px] text-muted-foreground">
              <span>
                <kbd className="kb">↑↓←→</kbd> 移動 · <kbd className="kb">Enter</kbd> 跳轉 ·{' '}
                <kbd className="kb">Esc</kbd> 退出
              </span>
              <span className="text-[10px] opacity-60">點兩下卡片亦可跳轉</span>
            </div>
          </motion.div>

          {/* 自訂細 scrollbar、永遠保留、不閃 */}
          <style jsx global>{`
            .ms-scroll::-webkit-scrollbar {
              width: 8px;
            }
            .ms-scroll::-webkit-scrollbar-track {
              background: transparent;
            }
            .ms-scroll::-webkit-scrollbar-thumb {
              background: rgba(232, 160, 32, 0.18);
              border-radius: 4px;
              border: 2px solid transparent;
              background-clip: padding-box;
            }
            .ms-scroll::-webkit-scrollbar-thumb:hover {
              background: rgba(232, 160, 32, 0.32);
              background-clip: padding-box;
            }
            .ms-scroll {
              scrollbar-width: thin;
              scrollbar-color: rgba(232, 160, 32, 0.25) transparent;
            }
          `}</style>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
