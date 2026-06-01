// apps/nx-ui/src/features/layout/ui/MobileFab.tsx
// v1.2 §10.4 §10.5：手機右下浮動功能鍵 ⊕ + 抽屜（4 分類入口）
//
// 範式（Alex Q2=a 拍板）：
// - ⊕ 在 dock 上方（bottom-[72px]、56 dock + 16 gap）
// - 點開底部 sheet 抽屜
// - 4 分類入口：進貨 / 銷貨 / 庫存 / 報表（對齊 §10.4、無「財務」）
// - 權限過濾：重用 usePermissions hook（與 BusinessTopNav 同邏輯、§10.5）
// - 點分類跳該模組 hub、跟桌面 BusinessTopNav 一致語意
// - lg:hidden（手機才顯示）+ 用 portal 避免被 ancestor 切到
'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { LineChart, type LucideIcon, Plus, ShoppingCart, TrendingUp, Warehouse, X } from 'lucide-react';

import { usePermissions } from '@/features/auth/hooks/useHasPermission';
import { cn } from '@/lib/utils';

interface CategoryEntry {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** 任一 permission 命中即顯示（與 BusinessTopNav 一致） */
  permissions: string[];
}

const CATEGORIES: CategoryEntry[] = [
  {
    key: 'purchase',
    label: '進貨',
    href: '/dashboard/purchase',
    icon: ShoppingCart,
    permissions: [
      'purchase.rfq.list',
      'purchase.po.list',
      'purchase.rr.list',
      'purchase.pr.list',
      'purchase.demand.list',
      'purchase.warranty-claim.list',
      'purchase.vendor.list',
      'purchase.product.list',
    ],
  },
  {
    key: 'sale',
    label: '銷貨',
    href: '/dashboard/nx04',
    icon: TrendingUp,
    permissions: [
      'sale.quote.list',
      'sale.so.list',
      'sale.sr.list',
      'sale.ti.list',
      'sale.customer.list',
    ],
  },
  {
    key: 'inventory',
    label: '庫存',
    href: '/dashboard/inventory',
    icon: Warehouse,
    permissions: [
      'inventory.stocktake.list',
      'inventory.stock-query.list',
      'inventory.issue-report.list',
      'inventory.conversion.list',
      'inventory.location.list',
      'inventory.part-stock-setting.list',
    ],
  },
  {
    key: 'report',
    label: '報表',
    href: '/dashboard/report',
    icon: LineChart,
    permissions: [
      'report.personal.view',
      'report.sales.view',
      'report.purchase.view',
      'report.inventory.view',
      'report.finance.view',
      'report.operation.view',
    ],
  },
];

function hasAny(perms: string[], required: string[]): boolean {
  if (perms.includes('*')) return true;
  return required.some((r) => perms.includes(r));
}

export function MobileFab() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { permissions, loading } = usePermissions();

  useEffect(() => setMounted(true), []);

  // ESC 關閉
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (loading) return null;

  const visible = CATEGORIES.filter((c) => hasAny(permissions, c.permissions));
  if (visible.length === 0) return null;

  const content = (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="開啟功能選單"
        aria-expanded={open}
        className={cn(
          'fixed bottom-[72px] right-4 z-50 size-14 rounded-full',
          'bg-[#E8A020] text-black shadow-lg shadow-[#E8A020]/30',
          'flex items-center justify-center transition hover:bg-[#E8A020]/90 active:scale-95',
          'lg:hidden',
          open && 'opacity-0 pointer-events-none',
        )}
      >
        <Plus className="size-7" aria-hidden />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="功能選單">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="關閉功能選單"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0',
              'rounded-t-2xl border-t border-[#2A2A30] bg-[#0E0E12]',
              'pb-[calc(env(safe-area-inset-bottom)+1rem)]',
              'animate-in slide-in-from-bottom duration-200',
            )}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-sm font-semibold text-[#E8E8EB]">功能選單</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="關閉"
                className="rounded-md p-1 text-[#888892] hover:bg-white/5 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 pb-2">
              {visible.map((c) => {
                const Icon = c.icon;
                return (
                  <Link
                    key={c.key}
                    href={c.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#0A0A0C]/60 p-5 text-center',
                      'transition active:scale-95 hover:border-[#E8A020]/60 hover:bg-[#E8A020]/5',
                    )}
                  >
                    <Icon className="size-8 text-[#E8A020]" aria-hidden />
                    <span className="text-sm font-medium text-[#E8E8EB]">{c.label}</span>
                  </Link>
                );
              })}
            </div>
            <p className="px-4 pt-1 text-center text-[10px] text-[#5A5A60]">
              點選分類進入該模組（v1.2 §10.4 範式、不含財務）
            </p>
          </div>
        </div>
      ) : null}
    </>
  );

  // Portal 到 body、避免 ancestor 的 transform / backdrop-filter 影響 fixed positioning
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
