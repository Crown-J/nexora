'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
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

function isDockActive(pathname: string, href: string): boolean {
  if (href === '/home') return pathname === '/home';
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/base') return pathname === '/base' || pathname.startsWith('/base/');
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

function DockIcon({
  item,
  mouseAxis,
  active,
  altHint,
}: {
  item: DockNavItem;
  mouseAxis: ReturnType<typeof useMotionValue<number>>;
  active: boolean;
  altHint: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseAxis, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { y: 0, height: 40 };
    return val - bounds.y - bounds.height / 2;
  });

  const widthSync = useTransform(distance, [-120, 0, 120], [42, 62, 42]);
  const width = useSpring(widthSync, { mass: 0.22, stiffness: 210, damping: 18 });

  const title =
    altHint != null ? `${item.label}（Alt+X 後按 ${altHint}）` : `${item.label}（僅點擊）`;

  return (
    <Link
      href={item.href}
      className="group/docklink flex items-center gap-2"
      title={title}
      aria-label={altHint ? `${item.label}，快捷鍵 ${altHint}` : item.label}
    >
      <motion.div
        ref={ref}
        style={{ width, height: width }}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-2xl transition-colors cursor-pointer relative',
          active
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground',
        )}
      >
        <item.icon className="w-1/2 h-1/2" />
        <div className="absolute left-full ml-3 px-2 py-1 bg-card border border-border rounded-md text-xs whitespace-nowrap opacity-0 group-hover/docklink:opacity-100 transition-opacity pointer-events-none z-50 text-foreground">
          {item.label}
        </div>
      </motion.div>
      {altHint ? (
        <span
          className={cn(
            'w-5 text-center font-mono text-[11px] font-bold tabular-nums leading-none',
            active ? 'text-primary' : 'text-muted-foreground',
          )}
          aria-hidden
        >
          {altHint}
        </span>
      ) : null}
    </Link>
  );
}

export function Dock() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const mouseY = useMotionValue(Infinity);
  const [isOpen, setIsOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const isOpenRef = useRef(false);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      // Alt+X：切換 DOCK（不在可編輯欄位內觸發，避免與輸入衝突）
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'x') {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        setIsOpen((o) => !o);
        return;
      }

      if (!isOpenRef.current) return;

      if (isEditableTarget(e.target)) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }

      if (e.key === 'Tab') return;

      // 單鍵導覽：不與 Alt／Ctrl／Meta 併用（併用時僅關閉面板）
      if (e.altKey || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setIsOpen(false);
        return;
      }

      const letter = e.key.length === 1 ? e.key.toLowerCase() : '';
      const href = letter ? DOCK_LETTER_TO_HREF[letter] : undefined;
      if (href) {
        e.preventDefault();
        setIsOpen(false);
        router.push(href);
        return;
      }

      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;

      e.preventDefault();
      setIsOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router]);

  useEffect(() => {
    const onGlobalPointerDown = (e: PointerEvent) => {
      if (!isOpen) return;
      const t = e.target as Node | null;
      if (!t) return;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    document.addEventListener('pointerdown', onGlobalPointerDown);
    return () => document.removeEventListener('pointerdown', onGlobalPointerDown);
  }, [isOpen]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setIsOpen(false);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none hidden lg:block">
      <button
        ref={triggerRef}
        type="button"
        aria-label={isOpen ? '關閉側邊導覽' : '開啟側邊導覽（Alt+X）'}
        onClick={() =>
          setIsOpen((prev) => {
            const next = !prev;
            return next;
          })
        }
        className={cn(
          'pointer-events-auto fixed left-[22px] top-1/2 -translate-y-1/2 h-14 w-14 rounded-full',
          'border border-primary/35 bg-[radial-gradient(circle_at_40%_35%,rgba(244,180,0,0.22)_0%,rgba(244,180,0,0.06)_58%,rgba(0,0,0,0.25)_100%)]',
          'backdrop-blur-md transition-all duration-300',
          'shadow-[0_12px_34px_rgba(0,0,0,0.42)]',
          'hover:shadow-[0_0_22px_rgba(244,180,0,0.45),0_0_42px_rgba(244,180,0,0.22)] hover:border-primary/60',
          'cursor-pointer',
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-primary via-primary to-primary/70 shadow-lg glow-primary" />
        </div>
        <div className="absolute inset-1 border border-primary/40 rounded-full animate-orbit">
          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary/80" />
        </div>
        <div className="absolute inset-0 border border-primary/20 rounded-full rotate-60 animate-orbit-reverse">
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/60" />
        </div>
        <div
          className="absolute -inset-0.5 border border-primary/10 rounded-full rotate-[-30deg] animate-orbit"
          style={{ animationDuration: '16s' }}
        >
          <div className="absolute top-1/2 -right-0.5 -translate-y-1/2 w-1 h-1 rounded-full bg-primary/50" />
        </div>
      </button>

      <motion.div
        ref={panelRef}
        initial={false}
        animate={{
          x: isOpen ? 0 : -18,
          opacity: isOpen ? 1 : 0,
          scale: isOpen ? 1 : 0.98,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        transition={{ type: 'spring', stiffness: 280, damping: 24, mass: 0.78 }}
        onMouseMove={(e) => mouseY.set(e.clientY)}
        onMouseLeave={() => mouseY.set(Infinity)}
        className={cn(
          'pointer-events-auto fixed left-[92px] top-1/2 -translate-y-1/2 flex flex-col items-stretch gap-2.5 p-3 pr-3.5 rounded-3xl',
          'bg-sidebar/92 backdrop-blur-xl border border-sidebar-border',
          'shadow-[0_14px_55px_rgba(0,0,0,0.42)]',
        )}
      >
        {HOME_DOCK_ITEMS.map((item, i) => (
          <DockIcon
            key={item.href}
            item={item}
            mouseAxis={mouseY}
            active={isDockActive(pathname, item.href)}
            altHint={DOCK_ITEM_ALT_HINT[i] ?? null}
          />
        ))}
      </motion.div>
    </div>
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
