'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Layers3,
  ShoppingCart,
  Package,
  Warehouse,
  DollarSign,
  BarChart3,
  ChevronRight,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@design/primitives/dropdown-menu';
import { cn } from '@design/utils/cn';
// QWERTY 快捷格已移除（鋼鐵星球範式不再需要）
import { useDashboardHomePlanOptional } from '@/features/nx00/context/DashboardHomePlanContext';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import {
  canAccessMasterCard,
  getMasterHubSections,
  normalizePlanCode,
} from '@/features/nx01/shell/config/master-cards';

export type DockNavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
};

/** 與 demo/home 一致；連結對應 NEXORA 實際路由（v2.0 語意化） */
export const HOME_DOCK_ITEMS: DockNavItem[] = [
  { icon: Home,         label: '首頁', href: '/dashboard' },
  { icon: Layers3,      label: '主檔', href: '/dashboard/master' },
  { icon: ShoppingCart, label: '採購', href: '/dashboard/purchase' },
  { icon: Package,      label: '銷貨', href: '/dashboard/sale' },
  { icon: Warehouse,    label: '庫存', href: '/dashboard/inventory' },
  { icon: DollarSign,   label: '財務', href: '/dashboard/finance' },
  { icon: BarChart3,    label: '報表', href: '/dashboard/report' },
];

/** Alt+X 開啟後，單鍵：H 首頁／B 主檔／P 採購／S 銷貨／W 庫存／M 財務／R 報表 */
const DOCK_LETTER_TO_HREF: Record<string, string> = {
  h: '/dashboard',
  b: '/dashboard/master',
  p: '/dashboard/purchase',
  s: '/dashboard/sale',
  w: '/dashboard/inventory',
  m: '/dashboard/finance',
  r: '/dashboard/report',
};

const DOCK_ITEM_ALT_HINT: (string | null)[] = ['H', 'B', 'P', 'S', 'W', 'M', 'R'];

export function isDockActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }
  if (href === '/dashboard/master') {
    return pathname.startsWith('/dashboard/master');
  }
  if (href === '/dashboard/purchase') {
    return pathname.startsWith('/dashboard/purchase');
  }
  if (href === '/dashboard/sale') {
    return pathname.startsWith('/dashboard/sale');
  }
  if (href === '/dashboard/inventory') {
    return pathname.startsWith('/dashboard/inventory');
  }
  if (href === '/dashboard/finance') {
    return pathname.startsWith('/dashboard/finance');
  }
  if (href === '/dashboard/report') {
    return pathname.startsWith('/dashboard/report');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

const dockItemFocusCls =
  'cursor-pointer rounded-lg p-0 outline-none focus:bg-primary/15 focus:text-primary data-[highlighted]:bg-primary/15 data-[highlighted]:text-primary';

function DockGridLink({ item, hint, pathname }: { item: DockNavItem; hint: string | null; pathname: string }) {
  const active = isDockActive(pathname, item.href);
  return (
    <DropdownMenuItem asChild className={dockItemFocusCls}>
      <Link
        href={item.href}
        className={cn(
          'group/dockrow flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors',
          'text-foreground',
          'data-[highlighted]:text-primary',
          active && 'bg-primary/15 text-primary',
          !active && 'data-[highlighted]:bg-transparent',
        )}
        title={hint != null ? `${item.label}（Alt+X 後 ${hint}）` : item.label}
      >
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-secondary/50 text-foreground',
            'group-data-[highlighted]/dockrow:border-primary/45 group-data-[highlighted]/dockrow:bg-primary/10 group-data-[highlighted]/dockrow:text-primary',
            active && 'border-primary/40 bg-primary/10 text-primary',
          )}
        >
          <item.icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 font-medium group-data-[highlighted]/dockrow:text-primary">{item.label}</span>
        {hint ? (
          <kbd className="hidden shrink-0 rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary/80 group-data-[highlighted]/dockrow:border-primary/45 group-data-[highlighted]/dockrow:text-primary sm:inline-block">
            {hint}
          </kbd>
        ) : null}
      </Link>
    </DropdownMenuItem>
  );
}

function DockSubLink({ href, label, kbd }: { href: string; label: string; kbd: string }) {
  const pathname = usePathname() ?? '';
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <DropdownMenuItem asChild className={dockItemFocusCls}>
      <Link
        href={href}
        className={cn(
          'group/subrow flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm',
          active ? 'bg-primary/15 text-primary' : 'text-foreground',
        )}
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <kbd className="shrink-0 rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary/80">{kbd}</kbd>
      </Link>
    </DropdownMenuItem>
  );
}

function PurchaseCenterSub({ pathname }: { pathname: string }) {
  const active = isDockActive(pathname, '/dashboard/purchase');
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={cn(dockItemFocusCls, 'data-[state=open]:bg-primary/10')}>
        <div
          className={cn(
            'group/dockrow flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm',
            active && 'text-primary',
          )}
        >
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-secondary/50 text-foreground',
              active && 'border-primary/40 bg-primary/10 text-primary',
            )}
          >
            <ShoppingCart className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 text-left font-medium">採購</span>
          <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
          <kbd className="hidden shrink-0 rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary/80 sm:inline-block">P</kbd>
        </div>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        sideOffset={6}
        className="min-w-[13rem] border-border/80 bg-popover/95 p-1 shadow-lg backdrop-blur-xl"
      >
        {/* 03 收尾 B 2026-06-08：對齊手冊「進貨沒有採購中心」、dock 展開完整 7 流程 + 主檔 */}
        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-normal tracking-widest text-muted-foreground">採購流程</DropdownMenuLabel>
        <DockSubLink href="/dashboard/purchase/domestic" label="採購需求" kbd="R" />
        <DockSubLink href="/dashboard/purchase/rfq" label="詢價單" kbd="F" />
        <DockSubLink href="/dashboard/purchase/po" label="採購單" kbd="P" />
        <DockSubLink href="/dashboard/purchase/rr" label="進貨單" kbd="I" />
        <DockSubLink href="/dashboard/purchase/pr" label="退貨單" kbd="B" />
        <DockSubLink href="/dashboard/purchase/foreign" label="國外進貨追蹤" kbd="—" />
        <DockSubLink href="/dashboard/purchase/warranty" label="保固申請" kbd="—" />
        <DropdownMenuSeparator className="bg-border/60" />
        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-normal tracking-widest text-muted-foreground">主檔</DropdownMenuLabel>
        <DockSubLink href="/dashboard/purchase/product" label="產品管理" kbd="—" />
        <DockSubLink href="/dashboard/purchase/vendor" label="供應商管理" kbd="—" />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function SaleCenterSub({ pathname }: { pathname: string }) {
  const active = isDockActive(pathname, '/dashboard/sale');
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={cn(dockItemFocusCls, 'data-[state=open]:bg-primary/10')}>
        <div className={cn('group/dockrow flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm', active && 'text-primary')}>
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-secondary/50 text-foreground',
              active && 'border-primary/40 bg-primary/10 text-primary',
            )}
          >
            <Package className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 text-left font-medium">銷貨</span>
          <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
          <kbd className="hidden shrink-0 rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary/80 sm:inline-block">S</kbd>
        </div>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent sideOffset={6} className="min-w-[12rem] border-border/80 bg-popover/95 p-1 shadow-lg backdrop-blur-xl">
        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-normal tracking-widest text-muted-foreground">銷售流程</DropdownMenuLabel>
        <DockSubLink href="/dashboard/sale/qt" label="報價單" kbd="Q" />
        <DockSubLink href="/dashboard/sale/so" label="銷貨單" kbd="S" />
        {/* C7 dock bug fix 2026-06-09：銷退單應到 sale/return、不是 sale（會 redirect 回 SO） */}
        <DockSubLink href="/dashboard/sale/return" label="銷退單" kbd="R" />
        <DropdownMenuSeparator className="bg-border/60" />
        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-normal tracking-widest text-muted-foreground">定價工具</DropdownMenuLabel>
        {/* F1-D 銷貨優惠價子系統 2026-06-08：促銷規則入口 */}
        <DockSubLink href="/dashboard/sale/promotion" label="促銷規則" kbd="P" />
        {/* F2 組合套餐 2026-06-09 */}
        <DockSubLink href="/dashboard/sale/bundle" label="組合套餐" kbd="B" />
        <DropdownMenuSeparator className="bg-border/60" />
        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-normal tracking-widest text-muted-foreground">主檔</DropdownMenuLabel>
        {/* F1-B 銷貨路徑收斂 2026-06-08：客戶主檔走六分類共用入口、URL 不露 nx 代碼 */}
        <DockSubLink href="/dashboard/master/partners" label="客戶管理" kbd="—" />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function InventoryCenterSub({ pathname }: { pathname: string }) {
  const active = isDockActive(pathname, '/dashboard/inventory');
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={cn(dockItemFocusCls, 'data-[state=open]:bg-primary/10')}>
        <div className={cn('group/dockrow flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm', active && 'text-primary')}>
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-secondary/50 text-foreground',
              active && 'border-primary/40 bg-primary/10 text-primary',
            )}
          >
            <Warehouse className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 text-left font-medium">庫存</span>
          <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
          <kbd className="hidden shrink-0 rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary/80 sm:inline-block">W</kbd>
        </div>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent sideOffset={6} className="min-w-[12rem] border-border/80 bg-popover/95 p-1 shadow-lg backdrop-blur-xl">
        {/* 庫存路徑收斂 D 2026-06-08：URL 一律 /dashboard/inventory/*、不露 nx 代碼 */}
        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-normal tracking-widest text-muted-foreground">庫存作業</DropdownMenuLabel>
        <DockSubLink href="/dashboard/inventory/balance" label="庫存一覽" kbd="V" />
        <DockSubLink href="/dashboard/inventory/ledger" label="庫存台帳" kbd="L" />
        <DockSubLink href="/dashboard/inventory/stocktake" label="盤點單" kbd="S" />
        <DockSubLink href="/dashboard/inventory/transfer" label="調撥單" kbd="T" />
        <DockSubLink href="/dashboard/inventory/init" label="開帳單" kbd="I" />
        <DropdownMenuSeparator className="bg-border/60" />
        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-normal tracking-widest text-muted-foreground">主檔</DropdownMenuLabel>
        <DockSubLink href="/dashboard/inventory/warehouse" label="倉位/庫位管理" kbd="—" />
        <DockSubLink href="/dashboard/purchase/product" label="產品管理" kbd="—" />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

/** 頂欄星球本體（軌道動畫與 NEXORA 品牌一致） */
export function PlanetOrbTrigger({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none relative h-10 w-10', className)} aria-hidden>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-primary via-primary to-primary/70 shadow-lg glow-primary" />
      </div>
      <div className="absolute inset-1 rounded-full border border-primary/40 animate-orbit">
        <div className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary/80" />
      </div>
      <div className="absolute inset-0 rotate-60 rounded-full border border-primary/20 animate-orbit-reverse">
        <div className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary/60" />
      </div>
      <div
        className="absolute -inset-0.5 rotate-[-30deg] rounded-full border border-primary/10 animate-orbit"
        style={{ animationDuration: '16s' }}
      >
        <div className="absolute top-1/2 -right-0.5 h-1 w-1 -translate-y-1/2 rounded-full bg-primary/50" />
      </div>
    </div>
  );
}

/**
 * 頂欄左側：星球開啟「往下展開」模組選單（原左側 Dock 項目）。
 *
 * 星球按鈕效果（摘要）：
 * - 軌道動畫：`animate-orbit`／`animate-orbit-reverse`（CSS）
 * - Hover：`scale-105`、金色邊框與外光 `box-shadow`
 * - 選單開啟：`data-[state=open]` 與上述類似加亮（與 Radix 狀態同步）
 * - 快捷鍵：Alt+X 切換；開啟時 H／B／P／S／W／M／R 單鍵跳轉
 *
 * 關閉選單後會對 trigger `blur()`，避免 `:focus` 殘留看起來仍「發亮」。
 */
type MenuLevel = 'root' | 'base';

export function NavPlanetMenu() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // 業界改革 #26 v1：contextual menu state（root = 6 模組、base = 25 主檔 + 返回）
  const [menuLevel, setMenuLevel] = useState<MenuLevel>('root');
  const menuLevelRef = useRef<MenuLevel>('root');
  const openRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // 25 主檔 list（業界改革 #22 v1.0 範式：master hub 卡片 metadata）。
  // [4-1] 2026-06-05：依使用者方案 filter 套件 / 高版本主檔、LITE 客戶不渲染（NX-MANUAL-02 v2.0 §④）。
  const { planCode } = useSessionMe();
  const allBaseCards = useMemo(() => {
    const userPlan = normalizePlanCode(planCode);
    return getMasterHubSections()
      .flatMap((s) => s.cards)
      .filter((c) => canAccessMasterCard(userPlan, c.minPlan));
  }, [planCode]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    menuLevelRef.current = menuLevel;
  }, [menuLevel]);

  // 業界改革 #26 v1：開啟時依 pathname 決定 initial level
  // - 在主檔頁面（/dashboard/master 或 /dashboard/master/*）→ base level（直接顯示 25 主檔）
  // - 其他頁面 → root level（6 模組）
  // 關閉時 reset root（下次他頁開啟回模組層）
  useEffect(() => {
    if (!open) {
      setMenuLevel('root');
      return;
    }
    const isBaseContext = pathname === '/dashboard/master' || pathname.startsWith('/dashboard/master/');
    setMenuLevel(isBaseContext ? 'base' : 'root');
  }, [open, pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'x') {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }

      if (!openRef.current) return;
      if (isEditableTarget(e.target)) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }

      if (e.key === 'Tab') return;

      if (e.altKey || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setOpen(false);
        return;
      }

      const letter = e.key.length === 1 ? e.key.toLowerCase() : '';
      // 業界改革 #26：base level 時按 'b' 返回 root；root level 按 'b' 展開 base
      if (letter === 'b' && menuLevelRef.current === 'root') {
        e.preventDefault();
        setMenuLevel('base');
        return;
      }
      if (letter === 'b' && menuLevelRef.current === 'base') {
        e.preventDefault();
        setMenuLevel('root');
        return;
      }
      // 業界改革 #26 v1：'z' 鍵在 base level 返回 root（Crown 拍板 contextual 返回鍵）
      if (letter === 'z' && menuLevelRef.current === 'base') {
        e.preventDefault();
        setMenuLevel('root');
        return;
      }
      const href = letter ? DOCK_LETTER_TO_HREF[letter] : undefined;
      if (href) {
        e.preventDefault();
        setOpen(false);
        router.push(href);
        return;
      }

      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;

      // 業界改革 #26 v1：方向鍵 / Enter / Home / End / Space 交給 Radix DropdownMenu 處理
      // （focus 移動 / activate item / typeahead）、不關閉 menu
      // Root cause 修：之前 fallthrough 到 setOpen(false)、導致 ↑↓ 按下 menu 被關
      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'Enter' ||
        e.key === 'Home' ||
        e.key === 'End' ||
        e.key === ' '
      ) {
        return;
      }

      e.preventDefault();
      setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => setOpen(false));
  }, [pathname]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      queueMicrotask(() => triggerRef.current?.blur());
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className={cn(
            'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            'border border-primary/35 bg-[radial-gradient(circle_at_40%_35%,rgba(244,180,0,0.2)_0%,rgba(244,180,0,0.06)_55%,rgba(0,0,0,0.22)_100%)]',
            'shadow-[0_8px_28px_rgba(0,0,0,0.38)] backdrop-blur-md',
            'transition-[transform,box-shadow,border-color] duration-300 ease-out',
            'hover:scale-105 hover:border-primary/65',
            'hover:shadow-[0_0_20px_rgba(244,180,0,0.42),0_0_40px_rgba(244,180,0,0.18),0_10px_32px_rgba(0,0,0,0.35)]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            /* 用 Radix data-state，避免與 React open 不同步；勿依 :focus 做「發亮」以免關閉選單後殘影 */
            'data-[state=open]:scale-105 data-[state=open]:border-primary/70',
            'data-[state=open]:shadow-[0_0_24px_rgba(244,180,0,0.38),0_8px_28px_rgba(0,0,0,0.38)]',
          )}
          aria-label={open ? '關閉模組選單' : '開啟模組選單（Alt+X）'}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <PlanetOrbTrigger />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="start"
        sideOffset={10}
        className={cn(
          'w-[min(calc(100vw-2rem),20rem)] border-border/80 bg-popover/95 p-1.5 shadow-xl backdrop-blur-xl',
        )}
      >
        {menuLevel === 'root' ? (
          <>
            <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-normal tracking-widest text-muted-foreground">
              模組導覽
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/60" />
            <div className="grid max-h-[min(70vh,24rem)] grid-cols-1 gap-0.5 overflow-y-auto py-1 sm:grid-cols-2">
              {/* 業界改革 #26 v1：「主檔」改 contextual trigger（展開 25 主檔 sub menu）*/}
              <DropdownMenuItem
                className={dockItemFocusCls}
                onSelect={(e) => {
                  e.preventDefault();
                  setMenuLevel('base');
                }}
              >
                <button
                  type="button"
                  className="group/dockrow flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-foreground transition-colors data-[highlighted]:text-primary"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-secondary/50 text-foreground group-data-[highlighted]/dockrow:border-primary/45 group-data-[highlighted]/dockrow:bg-primary/10 group-data-[highlighted]/dockrow:text-primary">
                    <Layers3 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-left font-medium">主檔</span>
                  <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
                  <kbd className="hidden shrink-0 rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary/80 sm:inline-block">
                    B
                  </kbd>
                </button>
              </DropdownMenuItem>
              {/* 採購／銷貨／庫存：桌面 sub-menu / 手機直接跳（既有範式、後續軌 V2 統一 contextual）*/}
              <div className="contents lg:hidden">
                <DockGridLink item={HOME_DOCK_ITEMS[2]!} hint={DOCK_ITEM_ALT_HINT[2]!} pathname={pathname} />
              </div>
              <div className="hidden lg:contents">
                <PurchaseCenterSub pathname={pathname} />
              </div>
              <div className="contents lg:hidden">
                <DockGridLink item={HOME_DOCK_ITEMS[3]!} hint={DOCK_ITEM_ALT_HINT[3]!} pathname={pathname} />
              </div>
              <div className="hidden lg:contents">
                <SaleCenterSub pathname={pathname} />
              </div>
              <div className="contents lg:hidden">
                <DockGridLink item={HOME_DOCK_ITEMS[4]!} hint={DOCK_ITEM_ALT_HINT[4]!} pathname={pathname} />
              </div>
              <div className="hidden lg:contents">
                <InventoryCenterSub pathname={pathname} />
              </div>
              <DockGridLink item={HOME_DOCK_ITEMS[5]!} hint={DOCK_ITEM_ALT_HINT[5]!} pathname={pathname} />
              <DockGridLink item={HOME_DOCK_ITEMS[6]!} hint={DOCK_ITEM_ALT_HINT[6]!} pathname={pathname} />
            </div>
            <DropdownMenuSeparator className="bg-border/60" />
            <p className="px-2 pb-1 pt-0.5 text-[10px] leading-relaxed text-muted-foreground">
              <span className="hidden lg:inline">
                Alt+X 開關 · 點 NEXORA logo 回首頁 · B 主檔／P 採購／S 銷貨／W 庫存／M 財務／R 報表
              </span>
              <span className="lg:hidden">Alt+X 開關 · 點 NEXORA logo 回首頁</span>
            </p>
          </>
        ) : (
          <>
            <DropdownMenuItem
              className={cn(dockItemFocusCls, 'mb-0.5')}
              onSelect={(e) => {
                e.preventDefault();
                setMenuLevel('root');
              }}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                <span>返回模組</span>
              </button>
            </DropdownMenuItem>
            <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-normal tracking-widest text-muted-foreground">
              主檔導覽（25 項）
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/60" />
            <div className="grid max-h-[min(70vh,30rem)] grid-cols-1 gap-0.5 overflow-y-auto py-1 sm:grid-cols-2">
              {allBaseCards.map((card) => {
                const CardIcon = card.icon;
                const active = isDockActive(pathname, card.href);
                return (
                  <DropdownMenuItem key={card.id} asChild className={dockItemFocusCls}>
                    <Link
                      href={card.href}
                      className={cn(
                        'group/baserow flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                        'text-foreground data-[highlighted]:text-primary',
                        active && 'bg-primary/15 text-primary',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-secondary/50 text-foreground',
                          'group-data-[highlighted]/baserow:border-primary/45 group-data-[highlighted]/baserow:bg-primary/10 group-data-[highlighted]/baserow:text-primary',
                          active && 'border-primary/40 bg-primary/10 text-primary',
                        )}
                      >
                        <CardIcon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{card.title}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </div>
            <DropdownMenuSeparator className="bg-border/60" />
            <p className="px-2 pb-1 pt-0.5 text-[10px] leading-relaxed text-muted-foreground">
              ↑↓ 選擇 · Enter 進入 · Z / B / Esc 返回模組
            </p>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function isShortcutDockActive(pathname: string, href: string): boolean {
  const base = href.split('?')[0] ?? href;
  if (!base) return false;
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * 前綴匹配（含子頁全部隱藏）：
 * - /dashboard/master 及所有 /dashboard/master/* 子頁，避免上方 icon 列 + 底部 DOCK 雙擠壓
 *
 * 完全匹配（只中心首頁隱藏、子頁保留 DOCK 方便跨模組跳轉）：
 * - /dashboard/purchase / /dashboard/inventory
 *   這兩個中心還用舊版 MobileHubSectionTabs 緊貼底部，與 DOCK 衝突所以隱藏
 *
 * R7：/dashboard/sale 改成 4 分區 SectionTabs + 全站 DOCK 並存
 *   SectionTabs 以 offsetBottom=74 坐在 DOCK 上方，不需要再隱藏 DOCK
 */
const HIDE_MOBILE_DOCK_PREFIXES = [
  '/dashboard/master',
  // R5：SOP 精品示範有自己的固定底部操作列，避免與全站 DOCK 雙 bar 衝突
  '/dashboard/purchase/sop-demo',
  // R6：國內銷貨 SOP 精品示範同理
  '/dashboard/sale/sop-demo',
];
const HIDE_MOBILE_DOCK_EXACT = [
  '/dashboard/purchase',
  '/dashboard/inventory',
];

function shouldHideMobileDock(pathname: string): boolean {
  if (HIDE_MOBILE_DOCK_EXACT.includes(pathname)) return true;
  return HIDE_MOBILE_DOCK_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * 首頁 `/dashboard` 手機：頂欄星球負責模組導覽，底欄為五項「圖示＋功能名」（與桌面快捷列語意一致，不顯示鍵位）。
 * 其餘路由仍用模組圖示底欄。
 */
export function MobileDock() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const planCtx = useDashboardHomePlanOptional();
  const isDashboardHome = pathname === '/dashboard';

  // [2-1 polish] 手機 dock「主檔」按鈕：依使用者方案 filter 25 主檔、做 contextual dropdown
  // （比照桌面 NavPlanetMenu base level 範式、不再導向已 redirect 的 /dashboard/master hub）
  const { planCode } = useSessionMe();
  const baseCardsForUser = useMemo(() => {
    const userPlan = normalizePlanCode(planCode);
    return getMasterHubSections()
      .flatMap((s) => s.cards)
      .filter((c) => canAccessMasterCard(userPlan, c.minPlan));
  }, [planCode]);

  // QWERTY 快捷格已移除（首頁手機底部 dock 隨 QWERTY 一起退場、模組導覽改走 MasterTopBar）
  if (shouldHideMobileDock(pathname) || isDashboardHome) {
    return null;
  }

  // R7：非首頁模組 DOCK 視覺統一首頁 iOS 風格（圓角按鈕 + icon box + gradient）
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around gap-1 border-t border-sidebar-border bg-sidebar/95 p-2 backdrop-blur-md lg:hidden"
      aria-label="模組導覽"
    >
      {HOME_DOCK_ITEMS.map((item) => {
        const active = isDockActive(pathname, item.href);
        const Icon = item.icon;

        const itemBodyCls = cn(
          'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border border-border/50 p-1.5',
          'bg-gradient-to-b from-muted/45 to-muted/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
          'transition-colors active:scale-[0.98] hover:border-primary/45 hover:from-primary/15 hover:to-primary/8',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          active ? 'border-primary/40 text-primary' : 'text-muted-foreground hover:text-foreground',
        );
        const iconBoxCls = cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-secondary/50',
          active ? 'border-primary/40 bg-primary/10 text-primary' : 'text-foreground',
        );
        const itemLabelEl = (
          <span className="line-clamp-2 max-w-full text-center text-[9px] font-medium leading-tight text-foreground">
            {item.label}
          </span>
        );

        // 「主檔」項：改成 dropdown contextual trigger（不導航 hub、列 25 主檔依方案 filter）
        if (item.href === '/dashboard/master') {
          return (
            <DropdownMenu key={item.href}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title={item.label}
                  aria-label={`${item.label}（開啟主檔選單）`}
                  className={itemBodyCls}
                >
                  <span className={iconBoxCls}>
                    <Icon className="h-4 w-4" strokeWidth={1.65} aria-hidden />
                  </span>
                  {itemLabelEl}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="center"
                sideOffset={8}
                className="max-h-[60vh] w-[min(86vw,18rem)] overflow-y-auto border-border/80 bg-popover/95 p-1 shadow-2xl backdrop-blur-xl"
              >
                <DropdownMenuLabel className="px-2 py-1 text-[10px] font-normal uppercase tracking-[0.18em] text-muted-foreground">
                  主檔導覽
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/60" />
                {baseCardsForUser.map((card) => {
                  const CardIcon = card.icon;
                  const isActive = pathname === card.href || pathname.startsWith(`${card.href}/`);
                  return (
                    <DropdownMenuItem key={card.id} asChild className={dockItemFocusCls}>
                      <Link
                        href={card.href}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs',
                          isActive ? 'bg-primary/15 text-primary' : 'text-foreground',
                        )}
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border/60 bg-secondary/50 text-foreground">
                          <CardIcon className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{card.title}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            className={itemBodyCls}
          >
            <span className={iconBoxCls}>
              <Icon className="h-4 w-4" strokeWidth={1.65} aria-hidden />
            </span>
            {itemLabelEl}
          </Link>
        );
      })}
    </div>
  );
}
