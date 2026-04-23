// apps/nx-ui/src/features/sale/ui/hub/sections/DocumentsSection.tsx
/**
 * R7 銷售中心手機版「單據管理」分區。
 *
 * 7 個單據管理子功能（spec PART 6）：
 *   - 報價單據 / 調貨詢價 / 調貨單據 / 銷售單據
 *   - 客戶訂單（預訂單，獨立功能）
 *   - 銷退單據 / 保固單據
 *
 * 全部 enabled=false（Phase 3 只做 placeholder，真實列表不在春酒範圍）。
 * statsHighlight=true 時 stats 文字用金色表示「有待處理」，提示業務注意。
 */

'use client';

import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  Bookmark,
  ChevronRight,
  FileText,
  HelpCircle,
  Shield,
  ShoppingCart,
  Undo2,
} from 'lucide-react';

import { cx } from '@/shared/lib/cx';

interface DocumentItemDef {
  id: string;
  Icon: LucideIcon;
  title: string;
  /** 副標（通常置於 title 右側小括號內）；無則省略 */
  subtitle?: string;
  stats: string;
  /** 金色強調（通常代表有「待處理」數字） */
  statsHighlight?: boolean;
  route: string;
  enabled: boolean;
}

const ITEMS: readonly DocumentItemDef[] = [
  {
    id: 'quote',
    Icon: FileText,
    title: '報價單據管理',
    stats: '本月 142 張',
    route: '/dashboard/sale/docs/quote',
    enabled: false,
  },
  {
    id: 'inquiry',
    Icon: HelpCircle,
    title: '調貨詢價管理',
    stats: '本月 38 張 · 待回覆 3 張',
    statsHighlight: true,
    route: '/dashboard/sale/docs/inquiry',
    enabled: false,
  },
  {
    id: 'transfer',
    Icon: ArrowLeftRight,
    title: '調貨單據管理',
    stats: '本月 25 張',
    route: '/dashboard/sale/docs/transfer',
    enabled: false,
  },
  {
    id: 'sales',
    Icon: ShoppingCart,
    title: '銷售單據管理',
    stats: '本月 89 張 · 進行中 4 張',
    statsHighlight: true,
    route: '/dashboard/sale/docs/sales',
    enabled: false,
  },
  {
    id: 'orders',
    Icon: Bookmark,
    title: '客戶訂單管理',
    subtitle: '客戶預訂單',
    stats: '進行中 7 張',
    statsHighlight: true,
    route: '/dashboard/sale/docs/orders',
    enabled: false,
  },
  {
    id: 'return',
    Icon: Undo2,
    title: '銷退單據管理',
    stats: '本月 5 張',
    route: '/dashboard/sale/docs/return',
    enabled: false,
  },
  {
    id: 'warranty',
    Icon: Shield,
    title: '保固單據管理',
    stats: '本月 3 張 · 處理中 1 張',
    statsHighlight: true,
    route: '/dashboard/sale/docs/warranty',
    enabled: false,
  },
];

export function DocumentsSection() {
  const router = useRouter();

  return (
    <div className="space-y-4 px-4 pt-4">
      <header className="space-y-1">
        <h1 className="text-lg text-white">銷售中心 · 單據管理</h1>
        <p className="text-xs text-white/50">查詢與管理已建立的單據</p>
      </header>

      <div className="space-y-3">
        {ITEMS.map((item) => (
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
            {item.subtitle ? (
              <span className="text-xs text-white/40">（{item.subtitle}）</span>
            ) : null}
            {!item.enabled ? (
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/50">
                即將推出
              </span>
            ) : null}
          </div>
          <div
            className={cx(
              'text-xs',
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
