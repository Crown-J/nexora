// apps/nx-ui/src/features/nx01/shell/keyboard-card-master/MasterSwitcher.tsx
/**
 * MasterSwitcher — 主檔快速切換器（M 鍵叫出、卡片式 + 全鍵盤）
 *
 * 設計：
 *   - 浮層中央 modal、頂部 fuzzy search input、下方 22 個主檔卡片依 6 分區 group
 *   - input 自動 focus、打字過濾、↑↓←→ + Enter + Esc 由 modal 接管
 *   - 卡片：icon + label、focused = 金色 ring + framer-motion layoutId 平滑
 *   - 進場 framer-motion scale + opacity、reduce-motion 退化
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
} from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X as XIcon } from 'lucide-react';

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
  const [keyword, setKeyword] = useState('');
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 過濾 + 排序：可用主檔（非 disabled）打分
  const filtered = useMemo<MasterPageMeta[]>(() => {
    const kw = keyword.trim().toLowerCase();
    const all = MASTER_PAGES.filter((p) => !p.disabled);
    if (!kw) return all;
    return all.filter(
      (p) =>
        p.label.toLowerCase().includes(kw) ||
        p.id.toLowerCase().includes(kw),
    );
  }, [keyword]);

  // 依分區 group
  const grouped = useMemo(() => {
    return MASTER_CATEGORIES.map((cat) => ({
      cat,
      pages: filtered.filter((p) => p.category === cat.key),
    })).filter((g) => g.pages.length > 0);
  }, [filtered]);

  // ── 開啟：focus input + 初始 focusIdx 落在當前主檔（若可見）──
  useEffect(() => {
    if (!open) return;
    setKeyword('');
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    const idx = filtered.findIndex((p) => p.id === currentPageId);
    setFocusIdx(idx >= 0 ? idx : 0);
    return () => clearTimeout(t);
    // 只在 open 切換 true 時觸發初始化、不跟 filtered 變化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // keyword 變動：focus 重置到第一個結果
  useEffect(() => {
    if (!open) return;
    setFocusIdx(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

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
        // 手動 scrollBy（不用 element.scrollIntoView）避免冒泡到 document 觸發
        // modal 外側 scrollbar 閃現（Chrome 在 fixed modal 內 scrollIntoView 已知毛病）
        const target = cards[best];
        const container = scrollContainerRef.current;
        if (target && container) {
          const er = target.getBoundingClientRect();
          const cr = container.getBoundingClientRect();
          const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth';
          if (er.top < cr.top) {
            container.scrollBy({ top: er.top - cr.top - 8, behavior });
          } else if (er.bottom > cr.bottom) {
            container.scrollBy({ top: er.bottom - cr.bottom + 8, behavior });
          }
        }
      }
    },
    [focusIdx, reduced],
  );

  const handleActivate = useCallback(() => {
    const target = filtered[focusIdx];
    if (!target) return;
    if (target.id === currentPageId) {
      onClose();
      return;
    }
    onClose();
    tryNavigate(() => router.push(target.href), `master-switcher: ${target.label} → ${target.href}`);
  }, [filtered, focusIdx, currentPageId, onClose, router]);

  // input keydown：方向 / Enter / Esc 由 modal 接管
  const handleInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (keyword) {
        setKeyword('');
        return;
      }
      onClose();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleActivate();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus('up');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocus('down');
      return;
    }
    if (e.key === 'ArrowLeft') {
      // input 內 ← 預設用來移 cursor、但若 cursor 在開頭、視為跳左
      if (e.currentTarget.selectionStart === 0) {
        e.preventDefault();
        moveFocus('left');
      }
      return;
    }
    if (e.key === 'ArrowRight') {
      // input 內 → 預設用來移 cursor、但若 cursor 在尾端、視為跳右
      const v = e.currentTarget.value;
      if (e.currentTarget.selectionStart === v.length) {
        e.preventDefault();
        moveFocus('right');
      }
      return;
    }
  };

  if (!open) {
    return (
      <AnimatePresence>{null}</AnimatePresence>
    );
  }

  // 平鋪 filtered idx 對應到分區 group 內位置（卡片渲染時用）
  let flatIdx = 0;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 p-6 pt-[12vh] backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.15 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 6 }}
          transition={{ duration: reduced ? 0 : 0.22, ease: [0.2, 0.7, 0.2, 1] }}
          className="w-full max-w-3xl rounded-2xl border-2 border-[#E8A020]/50 bg-card p-5 shadow-2xl shadow-[#E8A020]/20"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wider text-foreground">切換主檔</h2>
            <span className="rounded-full bg-[#E8A020]/14 px-2 py-0.5 text-[10px] font-semibold text-[#E8A020]">
              M
            </span>
          </div>

          {/* 搜尋條 */}
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#E8A020]/40 bg-background/40 px-3 py-2">
            <Search className="h-4 w-4 text-[#E8A020]" />
            <input
              ref={inputRef}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleInputKey}
              placeholder="搜尋主檔名稱…（↑↓←→ 選 · Enter 跳 · Esc 退）"
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
            {keyword ? (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="rounded p-1 text-muted-foreground hover:bg-foreground/10"
                title="清除"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {/* 分區 + 卡片 grid */}
          <div
            ref={scrollContainerRef}
            className="max-h-[60vh] overflow-y-auto pr-1"
            style={{ scrollbarGutter: 'stable' }}
          >
            {grouped.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                找不到符合「{keyword}」的主檔
              </div>
            ) : (
              grouped.map(({ cat, pages }) => (
                <div key={cat.key} className="mb-4 last:mb-0">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground">
                    <span className="h-px flex-1 bg-border/40" />
                    <span>{cat.label}</span>
                    <span className="h-px flex-1 bg-border/40" />
                  </div>
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}
                  >
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
                            if (p.id === currentPageId) {
                              onClose();
                              return;
                            }
                            onClose();
                            tryNavigate(
                              () => router.push(p.href),
                              `master-switcher: ${p.label} → ${p.href}`,
                            );
                          }}
                          className={cn(
                            'relative cursor-pointer rounded-lg border bg-card/70 px-3 py-2.5 transition-colors',
                            'border-border/50 hover:border-[#E8A020]/60 hover:bg-card',
                          )}
                        >
                          {focused ? (
                            <motion.span
                              layoutId="master-switcher-ring"
                              className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-[#E8A020] [box-shadow:0_0_0_3px_rgba(232,160,32,0.18)]"
                              transition={
                                reduced
                                  ? { duration: 0 }
                                  : { type: 'spring', stiffness: 380, damping: 30 }
                              }
                            />
                          ) : null}
                          <div className="relative flex items-center gap-2.5">
                            <Icon
                              className={cn(
                                'size-[18px] shrink-0',
                                current ? 'text-[#E8A020]' : 'text-muted-foreground',
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <div
                                className={cn(
                                  'truncate text-sm font-semibold',
                                  current ? 'text-[#E8A020]' : 'text-foreground',
                                )}
                              >
                                {p.label}
                              </div>
                            </div>
                            {current ? (
                              <span className="shrink-0 rounded bg-[#E8A020]/16 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-[#E8A020]">
                                目前
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 底部 hint */}
          <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
            <span>
              <kbd className="kb">↑↓←→</kbd> 選 · <kbd className="kb">Enter</kbd> 跳 ·{' '}
              <kbd className="kb">Esc</kbd> 退
            </span>
            <span>共 {filtered.length} 個主檔</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
