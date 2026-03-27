'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  { icon: Layers3, label: '主檔', href: '/dashboard/nx00' },
  { icon: ShoppingCart, label: '採購', href: '/dashboard/nx01' },
  { icon: Package, label: '銷售', href: '/dashboard/nx03' },
  { icon: Warehouse, label: '庫存', href: '/dashboard/nx02' },
  { icon: DollarSign, label: '財務', href: '/dashboard/nx04' },
  { icon: BarChart3, label: '報表', href: '/dashboard' },
];

function isDockActive(pathname: string, href: string): boolean {
  if (href === '/home') return pathname === '/home';
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function DockIcon({
  item,
  mouseAxis,
  active,
}: {
  item: DockNavItem;
  mouseAxis: ReturnType<typeof useMotionValue<number>>;
  active: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseAxis, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { y: 0, height: 40 };
    return val - bounds.y - bounds.height / 2;
  });

  const widthSync = useTransform(distance, [-120, 0, 120], [42, 62, 42]);
  const width = useSpring(widthSync, { mass: 0.22, stiffness: 210, damping: 18 });

  return (
    <Link href={item.href} className="block" aria-label={item.label}>
      <motion.div
        ref={ref}
        style={{ width, height: width }}
        className={cn(
          'flex items-center justify-center rounded-2xl transition-colors cursor-pointer group relative',
          active
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground',
        )}
      >
        <item.icon className="w-1/2 h-1/2" />
        <div className="absolute left-full ml-3 px-2 py-1 bg-card border border-border rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-foreground">
          {item.label}
        </div>
      </motion.div>
    </Link>
  );
}

export function Dock() {
  const pathname = usePathname() ?? '';
  const mouseY = useMotionValue(Infinity);
  const [isOpen, setIsOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

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
    // 切頁後自動收回，避免換頁時遮擋內容
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none hidden lg:block">
      <button
        ref={triggerRef}
        type="button"
        aria-label={isOpen ? 'Close dock' : 'Open dock'}
        onClick={() => setIsOpen((prev) => !prev)}
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
          'pointer-events-auto fixed left-[92px] top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 p-3 rounded-3xl',
          'bg-sidebar/92 backdrop-blur-xl border border-sidebar-border',
          'shadow-[0_14px_55px_rgba(0,0,0,0.42)]',
        )}
      >
        {HOME_DOCK_ITEMS.map((item) => (
          <DockIcon
            key={item.href}
            item={item}
            mouseAxis={mouseY}
            active={isDockActive(pathname, item.href)}
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
