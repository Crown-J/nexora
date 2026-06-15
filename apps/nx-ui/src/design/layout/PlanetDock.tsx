// apps/nx-ui/src/components/shell/PlanetDock.tsx
// NX00 小星球 Dock：全系統唯一全域導覽
// 對齊 Hana 成品 system-engine.js dock 段（行 124-208）
// - 兩~三層 stack 導航（首頁/個人/主檔/採購/銷貨/庫存/財務/報表 + 主檔 6 分區）
// - 鍵盤：Alt+X 喚醒 / ArrowUp/Down 移動 / Enter 進入 / ArrowLeft 返回 / Esc 關閉
// - 滑鼠：點項目進入、點返回退層、點外面關閉

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, BarChart3, ChevronRight, Database, DollarSign, Home,
  Package, ShoppingCart, TrendingUp, User,
} from 'lucide-react';
import { DOCK_NAV, type DockItem } from '@data/home/home-data';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  user: User,
  database: Database,
  'shopping-cart': ShoppingCart,
  'trending-up': TrendingUp,
  package: Package,
  dollar: DollarSign,
  'bar-chart': BarChart3,
};

type Level = { items: DockItem[]; idx: number; title: string };

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PlanetDock({ open, onClose }: Props) {
  const router = useRouter();
  const [stack, setStack] = useState<Level[]>([{ items: DOCK_NAV, idx: 0, title: '導覽' }]);
  const rootRef = useRef<HTMLDivElement>(null);

  // 每次 open 變 true 時重設 stack（確保每次開都從根開始）
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- open 切 true 時必須同步重置 nav stack，是 dock 開關語意而非 derived state
      setStack([{ items: DOCK_NAV, idx: 0, title: '導覽' }]);
    }
  }, [open]);

  const navigateLeaf = useCallback(
    (leaf: DockItem) => {
      if (leaf.href) {
        router.push(leaf.href);
      }
      onClose();
    },
    [router, onClose],
  );

  const activate = useCallback(
    (item: DockItem) => {
      setStack((prev) => {
        const last = prev[prev.length - 1];
        const drillable = item.sub && item.sub.length > 0;
        if (drillable) {
          return [...prev, { items: item.sub!, idx: 0, title: item.label }];
        }
        // leaf：先標 idx、再導航
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        const newIdx = last.items.indexOf(item);
        if (newIdx >= 0) updated[lastIdx] = { ...last, idx: newIdx };
        // 延一個 frame 讓視覺先更新再導航 + 關閉
        queueMicrotask(() => navigateLeaf(item));
        return updated;
      });
    },
    [navigateLeaf],
  );

  const pop = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  // Alt+X 全域 toggle 在 parent 處理；這裡只攔自己 open 時的鍵盤
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (stack.length > 1) pop();
        else onClose();
        return;
      }
      const last = stack[stack.length - 1];
      const n = last.items.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setStack((prev) => {
          const u = [...prev];
          const li = u.length - 1;
          u[li] = { ...u[li], idx: (u[li].idx + 1) % n };
          return u;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setStack((prev) => {
          const u = [...prev];
          const li = u.length - 1;
          u[li] = { ...u[li], idx: (u[li].idx - 1 + n) % n };
          return u;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        activate(last.items[last.idx]);
      } else if (e.key === 'ArrowLeft' && stack.length > 1) {
        e.preventDefault();
        pop();
      } else if (e.key === 'ArrowRight') {
        const it = last.items[last.idx];
        if (it.sub && it.sub.length > 0) {
          e.preventDefault();
          activate(it);
        }
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, stack, pop, onClose, activate]);

  // 點外面關閉
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // 延一個 tick 避免開啟當下的 click event 立刻關閉
    const t = setTimeout(() => document.addEventListener('click', h), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', h);
    };
  }, [open, onClose]);

  if (!open) return null;

  const isMultiLevel = stack.length > 1;
  const currentTitle = isMultiLevel ? stack[stack.length - 1].title : '導覽';

  return (
    <div
      ref={rootRef}
      className="fixed left-3.5 top-[58px] z-[120] w-[260px] overflow-hidden rounded-2xl border border-border/40 bg-[color-mix(in_oklch,var(--popover)_94%,transparent)] backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 border-b border-border/30 px-3.5 py-3 text-xs font-semibold">
        {isMultiLevel ? (
          <button
            type="button"
            onClick={pop}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回
          </button>
        ) : (
          <span>{currentTitle}</span>
        )}
        {isMultiLevel && <span className="ml-2 text-foreground">{currentTitle}</span>}
        {!isMultiLevel && (
          <span className="ml-auto rounded px-1.5 py-0.5 font-mono text-[10px] text-[var(--warning)] border border-[var(--warning)]/40">
            Alt+X
          </span>
        )}
      </div>
      <div className="overflow-hidden">
        <div className="flex flex-col gap-0.5 p-1.5">
          {stack[stack.length - 1].items.map((item, j) => {
            const Icon = item.icon ? ICONS[item.icon] : null;
            const isFocus = j === stack[stack.length - 1].idx;
            const drillable = !!(item.sub && item.sub.length > 0);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => activate(item)}
                onMouseEnter={() =>
                  setStack((prev) => {
                    const u = [...prev];
                    const li = u.length - 1;
                    u[li] = { ...u[li], idx: j };
                    return u;
                  })
                }
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] transition ${
                  isFocus
                    ? 'bg-foreground/[0.06] ring-1 ring-[color-mix(in_srgb,var(--warning)_45%,transparent)]'
                    : 'hover:bg-foreground/[0.04]'
                }`}
              >
                {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : <span className="w-4" />}
                <span className="flex-1">{item.label}</span>
                {drillable && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
