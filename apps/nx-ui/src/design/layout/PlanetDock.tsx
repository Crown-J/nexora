// apps/nx-ui/src/design/layout/PlanetDock.tsx
// NX00 小星球 Dock：全系統唯一全域導覽
// 對齊：
// - 內容：docs/專案/規格書/核心/NEXORA-模組架構總覽（8 主選單 + 主檔 6 分區）
// - 排版/動畫：docs/專案/介面規格/ERP SYSTEM TEST/NEXORA 系統.html（dock-panel 範式）
//   - 寬 260、top:14、left:14、rounded-2xl、玻璃感
//   - 開：opacity 0→1 + translateY(-8) → 0 + scale(.97) → 1 / .2s
//   - 多層 stack 用 rail 橫向 translateX 滑動、不是整層替換
//   - header 切換：頂層「導覽 + Alt+X」/ 子層「← 返回 + 標題」
//   - 鍵盤：Alt+X 喚醒 / ↑↓ 移焦 / Enter 進入 / ← 返回 / Esc 關閉
//   - 滑鼠：點項目進入、點返回退層、點外面關閉

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { tryNavigate } from '@design/hooks/useDirtyGuard';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, AlertTriangle, ArrowDownLeft, ArrowLeft, ArrowUpRight,
  Award, BarChart3, BookOpen, Box, Boxes, Briefcase, Building, Building2,
  CalendarCheck, ChevronRight, Clipboard, ClipboardList, Coins, Combine,
  Crown, Database, DollarSign, FileText, Flag, Globe, Hand, Handshake,
  HelpCircle, Home, Layers, Link as LinkIcon, MapPin, Network, Package,
  PackageCheck, PackageMinus, PackageOpen, PackagePlus, Percent, Receipt,
  Repeat, Search, Shield, ShieldCheck, Ship, ShoppingCart, SlidersHorizontal,
  Tag, TrendingUp, Truck, Undo2, User, UserCheck, UserCog, UserSquare,
  Users, Users2, Warehouse,
} from 'lucide-react';
import { DOCK_NAV, type DockItem } from '@data/home/home-data';

// icon string → lucide component；DOCK_NAV 用 string、避免 data 層硬接 JSX
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  // 8 主選單
  home: Home,
  user: User,
  database: Database,
  'shopping-cart': ShoppingCart,
  'trending-up': TrendingUp,
  package: Package,
  dollar: DollarSign,
  'bar-chart': BarChart3,
  // 主檔 6 分區 + 子
  network: Network,
  'shield-check': ShieldCheck,
  warehouse: Warehouse,
  handshake: Handshake,
  boxes: Boxes,
  'book-open': BookOpen,
  'user-square': UserSquare,
  briefcase: Briefcase,
  building: Building,
  users: Users,
  'user-cog': UserCog,
  'map-pin': MapPin,
  'package-open': PackageOpen,
  'user-check': UserCheck,
  crown: Crown,
  award: Award,
  box: Box,
  tag: Tag,
  layers: Layers,
  link: LinkIcon,
  globe: Globe,
  flag: Flag,
  coins: Coins,
  // 採購 sub
  'alert-triangle': AlertTriangle,
  'help-circle': HelpCircle,
  'clipboard-list': ClipboardList,
  'package-plus': PackagePlus,
  ship: Ship,
  'package-minus': PackageMinus,
  shield: Shield,
  'building-2': Building2,
  // 銷貨 sub
  'file-text': FileText,
  receipt: Receipt,
  'undo-2': Undo2,
  search: Search,
  'package-check': PackageCheck,
  'users-2': Users2,
  // 庫存 sub
  hand: Hand,
  truck: Truck,
  clipboard: Clipboard,
  combine: Combine,
  'alert-circle': AlertCircle,
  'sliders-horizontal': SlidersHorizontal,
  repeat: Repeat,
  // 財務 sub
  'arrow-down-left': ArrowDownLeft,
  'arrow-up-right': ArrowUpRight,
  percent: Percent,
  'calendar-check': CalendarCheck,
};

type Level = { items: DockItem[]; idx: number; title: string };

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PlanetDock({ open, onClose }: Props) {
  const router = useRouter();
  const [stack, setStack] = useState<Level[]>([{ items: DOCK_NAV, idx: 0, title: '導覽' }]);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 開關生命週期：open=true → 立刻 mount、下幀切 visible（觸發 transition）；open=false → 先 transition 結束才 unmount
  useEffect(() => {
    if (open) {
      setStack([{ items: DOCK_NAV, idx: 0, title: '導覽' }]);
      setMounted(true);
    } else if (mounted) {
      const t = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  const navigateLeaf = useCallback(
    (leaf: DockItem) => {
      if (leaf.href) {
        const href = leaf.href;
        tryNavigate(() => router.push(href));
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
        // leaf：先把選中位置 mark 上、再延一幀導航 + 關閉（讓視覺先呼應點擊）
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        const newIdx = last.items.indexOf(item);
        if (newIdx >= 0) updated[lastIdx] = { ...last, idx: newIdx };
        queueMicrotask(() => navigateLeaf(item));
        return updated;
      });
    },
    [navigateLeaf],
  );

  const pop = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  // 鍵盤導航（open 期間）
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
  // 用 mousedown 而非 click：避免「點返回 → React commit 移除按鈕 → click 冒到 document 時 target 已脫離 DOM →
  // rootRef.contains 回 false → 誤觸 onClose」的時序競態（React 18 commit 在 onClick handler 跑完之後）
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', h);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const isMultiLevel = stack.length > 1;
  const currentTitle = isMultiLevel ? stack[stack.length - 1].title : '導覽';
  const n = stack.length;

  return (
    <div
      ref={rootRef}
      onClick={(e) => e.stopPropagation()}
      data-open={open}
      className="fixed left-3.5 top-[68px] z-[120] w-[260px] overflow-hidden rounded-2xl border border-border/40 bg-[color-mix(in_oklch,var(--popover)_94%,transparent)] backdrop-blur-xl shadow-2xl
        origin-top-left transition-[opacity,transform] duration-200 ease-out
        data-[open=false]:opacity-0 data-[open=false]:-translate-y-2 data-[open=false]:scale-[0.97] data-[open=false]:pointer-events-none
        data-[open=true]:opacity-100 data-[open=true]:translate-y-0 data-[open=true]:scale-100"
    >
      {/* Header：頂層顯「導覽 + Alt+X」、子層顯「← 返回 + 標題」 */}
      <div className="flex items-center gap-2 border-b border-border/30 px-3.5 py-3 text-xs font-semibold">
        {isMultiLevel ? (
          <>
            <button
              type="button"
              onClick={pop}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回
            </button>
            <span className="ml-2 text-foreground">{currentTitle}</span>
          </>
        ) : (
          <>
            <span>{currentTitle}</span>
            <span className="ml-auto rounded px-1.5 py-0.5 font-mono text-[10px] text-[var(--warning)] border border-[var(--warning)]/40">
              Alt+X
            </span>
          </>
        )}
      </div>

      {/* Rail：n 層 col 並排、寬 n×100%、translateX 滑到最後一層 */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-[280ms] ease-[cubic-bezier(.3,.8,.3,1)]"
          style={{
            width: `${n * 100}%`,
            transform: `translateX(-${(((n - 1) / n) * 100).toFixed(4)}%)`,
          }}
        >
          {stack.map((lvl, li) => (
            <div
              key={li}
              className="flex flex-col gap-0.5 p-1.5"
              style={{ width: `${(100 / n).toFixed(4)}%`, flex: '0 0 auto' }}
            >
              {lvl.items.map((item, j) => {
                const Icon = item.icon ? ICONS[item.icon] : null;
                const isFocus = li === n - 1 && j === lvl.idx;
                const drillable = !!(item.sub && item.sub.length > 0);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => activate(item)}
                    onMouseEnter={() =>
                      setStack((prev) => {
                        if (li !== prev.length - 1) return prev;
                        const u = [...prev];
                        u[li] = { ...u[li], idx: j };
                        return u;
                      })
                    }
                    className={`flex items-center gap-[11px] rounded-[9px] px-3 py-2.5 text-left text-[13px] transition ${
                      isFocus
                        ? 'bg-foreground/[0.06] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--warning)_45%,transparent)]'
                        : 'hover:bg-foreground/[0.04]'
                    }`}
                  >
                    {Icon ? (
                      <Icon className="h-[17px] w-[17px] flex-none text-muted-foreground" />
                    ) : (
                      <span className="w-[17px] flex-none" />
                    )}
                    <span className="flex-1">{item.label}</span>
                    {drillable && <ChevronRight className="h-3.5 w-3.5 flex-none text-muted-foreground/70" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
