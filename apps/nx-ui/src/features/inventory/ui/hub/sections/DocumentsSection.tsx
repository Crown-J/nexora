// apps/nx-ui/src/features/inventory/ui/hub/sections/DocumentsSection.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 8:庫存中心手機版「單據管理」分區。
 *
 * 7 個單據類型(spec PART 8):
 *   - 撿貨單管理 / 包貨單管理 / 送貨單管理
 *   - 調撥單管理 / 調貨取貨單管理
 *   - 進貨單管理 / 盤點單管理
 *
 * 全部 enabled=false(Phase 8 只做 placeholder,詳細列表頁不在大塊 3 範圍)。
 * 數字從 SalesStore 動態衍生(撿/包/送/調撥/調貨);進貨/盤點暫顯 —。
 * statsHighlight=true 時 stats 文字用金色表示「有進行中」。
 */

'use client';

import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  Box,
  ChevronRight,
  ClipboardList,
  Handshake,
  PackageCheck,
  ScanLine,
  Truck,
} from 'lucide-react';

import { cx } from '@/shared/lib/cx';
import { useSalesStore } from '@/features/sale/ui/fulfillment/store';

interface DocumentItemDef {
  id: string;
  Icon: LucideIcon;
  title: string;
  stats: string;
  statsHighlight: boolean;
  route: string;
  enabled: boolean;
}

export function DocumentsSection() {
  const router = useRouter();
  const pks = useSalesStore((s) => s.pks);
  const bxs = useSalesStore((s) => s.bxs);
  const dns = useSalesStore((s) => s.dns);
  const its = useSalesStore((s) => s.its);
  const tis = useSalesStore((s) => s.tis);

  const pkActive = pks.filter((p) => p.status !== 'completed').length;
  const bxActive = bxs.filter((b) => b.status !== 'completed').length;
  const dnActive = dns.filter((d) => d.status !== 'signed' && d.status !== 'cancelled').length;
  const itActive = its.filter((i) => i.status !== 'completed' && i.status !== 'cancelled').length;
  const tiActive = tis.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length;

  const items: readonly DocumentItemDef[] = [
    {
      id: 'picking',
      Icon: ClipboardList,
      title: '撿貨單管理',
      stats: buildStats(pks.length, pkActive),
      statsHighlight: pkActive > 0,
      route: '/dashboard/inventory/docs/picking',
      enabled: false,
    },
    {
      id: 'packing',
      Icon: Box,
      title: '包貨單管理',
      stats: buildStats(bxs.length, bxActive),
      statsHighlight: bxActive > 0,
      route: '/dashboard/inventory/docs/packing',
      enabled: false,
    },
    {
      id: 'delivery',
      Icon: Truck,
      title: '送貨單管理',
      stats: buildStats(dns.length, dnActive),
      statsHighlight: dnActive > 0,
      route: '/dashboard/inventory/docs/delivery',
      enabled: false,
    },
    {
      id: 'transfer',
      Icon: ArrowLeftRight,
      title: '調撥單管理',
      stats: buildStats(its.length, itActive),
      statsHighlight: itActive > 0,
      route: '/dashboard/inventory/docs/transfer',
      enabled: false,
    },
    {
      id: 'ti',
      Icon: Handshake,
      title: '調貨取貨單管理',
      stats: buildStats(tis.length, tiActive),
      statsHighlight: tiActive > 0,
      route: '/dashboard/inventory/docs/ti',
      enabled: false,
    },
    {
      id: 'receiving',
      Icon: PackageCheck,
      title: '進貨單管理',
      stats: '—',
      statsHighlight: false,
      route: '/dashboard/inventory/docs/receiving',
      enabled: false,
    },
    {
      id: 'stocktake',
      Icon: ScanLine,
      title: '盤點單管理',
      stats: '—',
      statsHighlight: false,
      route: '/dashboard/inventory/docs/stocktake',
      enabled: false,
    },
  ];

  return (
    <div className="space-y-4 px-4 pt-4">
      <header className="space-y-1">
        <h1 className="text-lg text-white">庫存中心 · 單據管理</h1>
        <p className="text-xs text-white/50">查詢與管理各類倉管單據</p>
      </header>

      <div className="space-y-3">
        {items.map((item) => (
          <DocumentItem
            key={item.id}
            item={item}
            onClick={() => item.enabled && router.push(item.route)}
          />
        ))}
      </div>
    </div>
  );
}

function buildStats(total: number, active: number): string {
  if (total === 0) return '本月 0 張';
  if (active === 0) return `本月 ${total} 張`;
  return `本月 ${total} 張 · 進行中 ${active} 張`;
}

interface DocumentItemProps {
  item: DocumentItemDef;
  onClick: () => void;
}

function DocumentItem({ item, onClick }: DocumentItemProps) {
  const { Icon } = item;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!item.enabled}
      className={cx(
        'w-full rounded-lg border p-4 text-left transition-all',
        item.enabled
          ? 'border-white/10 bg-white/5 hover:border-white/20'
          : 'cursor-not-allowed border-white/5 bg-white/[0.02] opacity-60',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <Icon className="h-5 w-5 text-white/60" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm text-white">{item.title}</span>
            {!item.enabled ? (
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/50">
                即將推出
              </span>
            ) : null}
          </div>
          <div
            className={cx(
              'text-xs tabular-nums',
              item.statsHighlight && item.enabled
                ? 'text-[#E8A020]'
                : item.statsHighlight
                  ? 'text-[#E8A020]/70'
                  : 'text-white/50',
            )}
          >
            {item.stats}
          </div>
        </div>

        {item.enabled ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
        ) : null}
      </div>
    </button>
  );
}
