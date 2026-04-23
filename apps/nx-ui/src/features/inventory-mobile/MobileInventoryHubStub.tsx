// apps/nx-ui/src/features/inventory-mobile/MobileInventoryHubStub.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 7:庫存中心手機版 hub(Phase 8 會擴成 4 分區)。
 *
 * 目前僅為 stub index 頁,列出 Phase 6/7 已做的 5 個清單入口,
 * 讓 demo 可直接切換倉管各階段畫面。
 *
 * Phase 8 完成 4 分區(狀態追蹤 / 工作站 / 單據管理 / 倉位管理)後,
 * 本檔會重構為完整的中心首頁。
 */

'use client';

import Link from 'next/link';
import {
  ArrowLeftRight,
  ClipboardList,
  Handshake,
  type LucideIcon,
  Package,
  Truck,
} from 'lucide-react';

import { useSalesStore } from '@/features/sale/ui/fulfillment/store';

interface Entry {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  count: number;
}

export function MobileInventoryHubStub() {
  const its = useSalesStore((s) => s.its);
  const tis = useSalesStore((s) => s.tis);
  const pks = useSalesStore((s) => s.pks);
  const bxs = useSalesStore((s) => s.bxs);
  const dns = useSalesStore((s) => s.dns);

  const entries: Entry[] = [
    {
      href: '/dashboard/inventory-mobile/transfer',
      label: '調撥清單',
      description: '他倉 → 本倉,完成後自動建撿貨單',
      icon: ArrowLeftRight,
      count: its.filter((it) => it.status !== 'completed' && it.status !== 'cancelled').length,
    },
    {
      href: '/dashboard/inventory-mobile/ti',
      label: '調貨取貨清單',
      description: '向同行取貨,完成後自動建撿貨單',
      icon: Handshake,
      count: tis.filter((ti) => ti.status !== 'completed' && ti.status !== 'cancelled').length,
    },
    {
      href: '/dashboard/inventory-mobile/picking',
      label: '撿貨清單',
      description: '完成撿貨後自動建包貨單',
      icon: ClipboardList,
      count: pks.filter((pk) => pk.status !== 'completed').length,
    },
    {
      href: '/dashboard/inventory-mobile/packing',
      label: '包貨清單',
      description: '完成包貨後自動建送貨單',
      icon: Package,
      count: bxs.filter((bx) => bx.status !== 'completed').length,
    },
    {
      href: '/dashboard/inventory-mobile/delivery',
      label: '送貨清單',
      description: '客戶簽收後自動完成 SO',
      icon: Truck,
      count: dns.filter((dn) => dn.status !== 'signed' && dn.status !== 'cancelled').length,
    },
  ];

  return (
    <div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <header className="space-y-1">
        <h1 className="text-lg text-white">庫存中心</h1>
        <p className="text-xs text-white/50">
          手機版 · 大塊 2 Phase 7(Phase 8 會重構為 4 分區)
        </p>
      </header>

      <div className="space-y-3">
        {entries.map((e) => {
          const Icon = e.icon;
          return (
            <Link
              key={e.href}
              href={e.href}
              className="block rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20 hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-5 w-5 text-white/80" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">{e.label}</span>
                    {e.count > 0 ? (
                      <span className="rounded bg-[#E8A020]/15 px-1.5 py-0.5 text-xs text-[#E8A020] tabular-nums">
                        {e.count}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs text-white/50">{e.description}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
