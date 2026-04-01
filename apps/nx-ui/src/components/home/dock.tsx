'use client';

import { useEffect, useRef, useState } from 'react';
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
  type LucideIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type DockNavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
};

/** 與 demo/home 一致；連結對應 NEXORA 實際路由 */
export const HOME_DOCK_ITEMS: DockNavItem[] = [
  { icon: Home, label: '首頁', href: '/home' },
  { icon: Layers3, label: '主檔', href: '/base' },
  { icon: ShoppingCart, label: '採購', href: '/dashboard/nx01' },
  { icon: Package, label: '銷貨', href: '/dashboard/nx03' },
  { icon: Warehouse, label: '庫存', href: '/dashboard/nx02' },
  { icon: DollarSign, label: '財務', href: '/dashboard/nx04' },
  { icon: BarChart3, label: '報表', href: '/dashboard' },
];

/** Alt+X 開啟後，單鍵：H 首頁／B 主檔／P 採購／S 銷貨／W 庫存／M 財務／R 報表 */
const DOCK_LETTER_TO_HREF: Record<string, string> = {
  h: '/home',
  b: '/base',
  p: '/dashboard/nx01',
  s: '/dashboard/nx03',
  w: '/dashboard/nx02',
  m: '/dashboard/nx04',
  r: '/dashboard',
};

const DOCK_ITEM_ALT_HINT: (string | null)[] = ['H', 'B', 'P', 'S', 'W', 'M', 'R'];

export function isDockActive(pathname: string, href: string): boolean {
  if (href === '/home') return pathname === '/home';
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/base') return pathname === '/base' || pathname.startsWith('/base/');
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.closest('input, textarea, select, [contenteditable="true"]') !== null;
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
    setOpen(false);
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
          {HOME_DOCK_ITEMS.map((item, i) => {
            const active = isDockActive(pathname, item.href);
            const hint = DOCK_ITEM_ALT_HINT[i];
            return (
              <DropdownMenuItem
                key={item.href}
                asChild
                className={cn(
                  'cursor-pointer rounded-lg p-0 outline-none',
                  /* 覆寫 shadcn 預設 accent（深色底會變成黑字，像消失）→ 金色主題 */
                  'focus:bg-primary/15 focus:text-primary',
                  'data-[highlighted]:bg-primary/15 data-[highlighted]:text-primary',
                )}
              >
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
                  <span className="min-w-0 flex-1 font-medium group-data-[highlighted]/dockrow:text-primary">
                    {item.label}
                  </span>
                  {hint ? (
                    <kbd className="hidden shrink-0 rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary/80 group-data-[highlighted]/dockrow:border-primary/45 group-data-[highlighted]/dockrow:text-primary sm:inline-block">
                      {hint}
                    </kbd>
                  ) : null}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </div>
        <DropdownMenuSeparator className="bg-border/60" />
        <p className="px-2 pb-1 pt-0.5 text-[10px] leading-relaxed text-muted-foreground">
          Alt+X 開關選單 · 開啟時可單鍵 H B P S W M R
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MobileDock() {
  const pathname = usePathname() ?? '';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around p-2 bg-sidebar/95 backdrop-blur-md border-t border-sidebar-border lg:hidden">
      {HOME_DOCK_ITEMS.map((item) => {
        const active = isDockActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
