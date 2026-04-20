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
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getDashboardQuickShortcuts } from '@/features/sys-dashboard/config/dashboardQuickShortcuts';
import { useDashboardHomePlanOptional } from '@/features/sys-dashboard/context/DashboardHomePlanContext';

export type DockNavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
};

/** 與 demo/home 一致；連結對應 NEXORA 實際路由（v2.0 語意化） */
export const HOME_DOCK_ITEMS: DockNavItem[] = [
  { icon: Home,         label: '首頁', href: '/dashboard' },
  { icon: Layers3,      label: '主檔', href: '/dashboard/base' },
  { icon: ShoppingCart, label: '採購', href: '/dashboard/purchase' },
  { icon: Package,      label: '銷貨', href: '/dashboard/sale' },
  { icon: Warehouse,    label: '庫存', href: '/dashboard/inventory' },
  { icon: DollarSign,   label: '財務', href: '/dashboard/finance' },
  { icon: BarChart3,    label: '報表', href: '/dashboard/report' },
];

/** Alt+X 開啟後，單鍵：H 首頁／B 主檔／P 採購／S 銷貨／W 庫存／M 財務／R 報表 */
const DOCK_LETTER_TO_HREF: Record<string, string> = {
  h: '/dashboard',
  b: '/dashboard/base',
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
  if (href === '/dashboard/base') {
    return pathname.startsWith('/dashboard/base');
  }
  if (href === '/dashboard/purchase') {
    return (
      pathname.startsWith('/dashboard/purchase') ||
      pathname.startsWith('/dashboard/nx02/domestic') ||
      pathname.startsWith('/dashboard/nx02/import') ||
      pathname.startsWith('/dashboard/nx02/special') ||
      pathname.startsWith('/dashboard/nx02/product') ||
      pathname.startsWith('/dashboard/nx02/vendor') ||
      pathname.startsWith('/dashboard/nx01')
    );
  }
  if (href === '/dashboard/sale') {
    return pathname.startsWith('/dashboard/sale') || pathname.startsWith('/dashboard/sales') || pathname.startsWith('/dashboard/nx04');
  }
  if (href === '/dashboard/inventory') {
    return (
      pathname.startsWith('/dashboard/inventory') ||
      pathname.startsWith('/dashboard/nx03') ||
      pathname.startsWith('/dashboard/nx02/balance') ||
      pathname.startsWith('/dashboard/nx02/ledger') ||
      pathname.startsWith('/dashboard/nx02/init') ||
      pathname.startsWith('/dashboard/nx02/stock-take') ||
      pathname.startsWith('/dashboard/nx02/stock-setting') ||
      pathname.startsWith('/dashboard/nx02/transfer') ||
      pathname.startsWith('/dashboard/nx02/shortage') ||
      pathname.startsWith('/dashboard/nx02/auto-replenish') ||
      pathname === '/dashboard/nx02'
    );
  }
  if (href === '/dashboard/finance') {
    return pathname.startsWith('/dashboard/finance') || pathname.startsWith('/dashboard/nx05');
  }
  if (href === '/dashboard/report') {
    return pathname.startsWith('/dashboard/report') || pathname.startsWith('/dashboard/nx08');
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
        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-normal tracking-widest text-muted-foreground">採購流程</DropdownMenuLabel>
        <DockSubLink href="/dashboard/purchase/domestic" label="採購需求" kbd="R" />
        <DockSubLink href="/dashboard/purchase/rfq" label="詢價單" kbd="F" />
        <DockSubLink href="/dashboard/purchase/po" label="採購單" kbd="P" />
        <DockSubLink href="/dashboard/purchase/rr" label="進貨單" kbd="I" />
        <DockSubLink href="/dashboard/purchase" label="退貨單" kbd="B" />
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
        <DockSubLink href="/dashboard/sale" label="銷退單" kbd="R" />
        <DropdownMenuSeparator className="bg-border/60" />
        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-normal tracking-widest text-muted-foreground">主檔</DropdownMenuLabel>
        <DockSubLink href="/dashboard/nx04/customer" label="客戶管理" kbd="—" />
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
        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-normal tracking-widest text-muted-foreground">庫存作業</DropdownMenuLabel>
        <DockSubLink href="/dashboard/nx03/workspace" label="庫存一覽" kbd="V" />
        <DockSubLink href="/dashboard/nx02/ledger" label="庫存台帳" kbd="L" />
        <DockSubLink href="/dashboard/nx02/stock-take" label="盤點單" kbd="S" />
        <DockSubLink href="/dashboard/nx02/transfer" label="調撥單" kbd="T" />
        <DockSubLink href="/dashboard/nx02/init" label="開帳單" kbd="I" />
        <DropdownMenuSeparator className="bg-border/60" />
        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-normal tracking-widest text-muted-foreground">主檔</DropdownMenuLabel>
        <DockSubLink href="/dashboard/nx03/warehouse-setting" label="倉位/庫位管理" kbd="—" />
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
export function NavPlanetMenu() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

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
      const href = letter ? DOCK_LETTER_TO_HREF[letter] : undefined;
      if (href) {
        e.preventDefault();
        setOpen(false);
        router.push(href);
        return;
      }

      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;

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
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-normal tracking-widest text-muted-foreground">
          模組導覽
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/60" />
        <div className="grid max-h-[min(70vh,24rem)] grid-cols-1 gap-0.5 overflow-y-auto py-1 sm:grid-cols-2">
          <DockGridLink item={HOME_DOCK_ITEMS[0]!} hint={DOCK_ITEM_ALT_HINT[0]!} pathname={pathname} />
          <DockGridLink item={HOME_DOCK_ITEMS[1]!} hint={DOCK_ITEM_ALT_HINT[1]!} pathname={pathname} />
          <PurchaseCenterSub pathname={pathname} />
          <SaleCenterSub pathname={pathname} />
          <InventoryCenterSub pathname={pathname} />
          <DockGridLink item={HOME_DOCK_ITEMS[5]!} hint={DOCK_ITEM_ALT_HINT[5]!} pathname={pathname} />
          <DockGridLink item={HOME_DOCK_ITEMS[6]!} hint={DOCK_ITEM_ALT_HINT[6]!} pathname={pathname} />
        </div>
        <DropdownMenuSeparator className="bg-border/60" />
        <p className="px-2 pb-1 pt-0.5 text-[10px] leading-relaxed text-muted-foreground">
          Alt+X 開關選單 · 單鍵 H B P S W M R · 採購／銷貨／庫存可展開子選單
        </p>
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
 * 首頁 `/dashboard` 手機：頂欄星球負責模組導覽，底欄為五項「圖示＋功能名」（與桌面快捷列語意一致，不顯示鍵位）。
 * 其餘路由仍用模組圖示底欄。
 */
export function MobileDock() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const planCtx = useDashboardHomePlanOptional();
  const isDashboardHome = pathname === '/dashboard';

  const quickShortcuts = useMemo(() => {
    if (!isDashboardHome) return null;
    const plan = planCtx?.planCode ?? 'LITE';
    return getDashboardQuickShortcuts(plan);
  }, [isDashboardHome, planCtx?.planCode]);

  if (isDashboardHome && quickShortcuts) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around gap-1 border-t border-sidebar-border bg-sidebar/95 p-2 backdrop-blur-md lg:hidden"
        aria-label="首頁常用功能"
      >
        {quickShortcuts.map((s) => {
          const Icon = s.Icon;
          const active = isShortcutDockActive(pathname, s.href);
          return (
            <button
              key={s.key}
              type="button"
              title={s.label}
              aria-label={s.label}
              onClick={() => router.push(s.href)}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border border-border/50 p-1.5',
                'bg-gradient-to-b from-muted/45 to-muted/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
                'transition-colors active:scale-[0.98] hover:border-primary/45 hover:from-primary/15 hover:to-primary/8',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                active ? 'border-primary/40 text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-secondary/50',
                  active ? 'border-primary/40 bg-primary/10 text-primary' : 'text-foreground',
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.65} aria-hidden />
              </span>
              <span className="line-clamp-2 max-w-full text-center text-[9px] font-medium leading-tight text-foreground">
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-sidebar-border bg-sidebar/95 p-2 backdrop-blur-md lg:hidden">
      {HOME_DOCK_ITEMS.map((item) => {
        const active = isDockActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg p-2 transition-colors',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
