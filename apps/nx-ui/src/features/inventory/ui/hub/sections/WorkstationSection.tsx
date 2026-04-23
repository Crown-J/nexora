// apps/nx-ui/src/features/inventory/ui/hub/sections/WorkstationSection.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 8~9:庫存中心手機版「工作站」分區。
 *
 * 7 個作業項目(spec PART 8):
 *   - 撿貨作業(enabled,PK 清單)
 *   - 包貨作業(enabled,BX 清單)
 *   - 送貨作業(enabled,DN 清單,外務視角)
 *   - 調撥作業(enabled,IT 清單)
 *   - 調貨取貨(enabled,TI 清單)
 *   - 進貨作業(disabled,Phase 9 placeholder)
 *   - 盤點作業(disabled,Phase 9 placeholder)
 *
 * Phase 8:route 先指向大塊 2 建的 /dashboard/inventory-mobile/* 臨時路徑;
 * Phase 9:會遷到 /dashboard/inventory/workstation/* 並刪除舊路徑。
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

interface WorkstationItemDef {
  id: string;
  Icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  route: string;
  enabled: boolean;
}

const ITEMS: readonly WorkstationItemDef[] = [
  {
    id: 'picking',
    Icon: ClipboardList,
    title: '撿貨作業',
    subtitle: '倉管員',
    description: '依銷貨單撿取貨物,完成後自動建包貨單',
    route: '/dashboard/inventory-mobile/picking',
    enabled: true,
  },
  {
    id: 'packing',
    Icon: Box,
    title: '包貨作業',
    subtitle: '倉管員',
    description: '確認數量後包裝封箱,完成後自動建送貨單',
    route: '/dashboard/inventory-mobile/packing',
    enabled: true,
  },
  {
    id: 'delivery',
    Icon: Truck,
    title: '送貨作業',
    subtitle: '外務專用',
    description: '配送、客戶簽收,完成 SO',
    route: '/dashboard/inventory-mobile/delivery',
    enabled: true,
  },
  {
    id: 'transfer',
    Icon: ArrowLeftRight,
    title: '調撥作業',
    subtitle: '倉管員',
    description: '他倉 → 本倉調撥任務,完成後自動建撿貨單',
    route: '/dashboard/inventory-mobile/transfer',
    enabled: true,
  },
  {
    id: 'ti',
    Icon: Handshake,
    title: '調貨取貨',
    subtitle: '外務 / 倉管員',
    description: '向同行取貨並入庫,完成後自動建撿貨單',
    route: '/dashboard/inventory-mobile/ti',
    enabled: true,
  },
  {
    id: 'receiving',
    Icon: PackageCheck,
    title: '進貨作業',
    subtitle: '倉管員',
    description: '驗貨、上架(與採購對接)',
    route: '/dashboard/inventory/workstation/receiving',
    enabled: false,
  },
  {
    id: 'stocktake',
    Icon: ScanLine,
    title: '盤點作業',
    subtitle: '倉管員',
    description: '定期或臨時盤點,確認帳實相符',
    route: '/dashboard/inventory/workstation/stocktake',
    enabled: false,
  },
];

export function WorkstationSection() {
  const router = useRouter();

  return (
    <div className="space-y-4 px-4 pt-4">
      <header className="space-y-1">
        <h1 className="text-lg text-white">庫存中心 · 工作站</h1>
        <p className="text-xs text-white/50">進入倉管作業流程</p>
      </header>

      <div className="space-y-3">
        {ITEMS.map((item) => (
          <WorkstationItem
            key={item.id}
            item={item}
            onClick={() => item.enabled && router.push(item.route)}
          />
        ))}
      </div>
    </div>
  );
}

interface WorkstationItemProps {
  item: WorkstationItemDef;
  onClick: () => void;
}

function WorkstationItem({ item, onClick }: WorkstationItemProps) {
  const { Icon } = item;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!item.enabled}
      className={cx(
        'w-full rounded-lg border p-4 text-left transition-all',
        item.enabled
          ? 'border-white/10 bg-white/5 hover:border-white/20 active:border-[#E8A020]/60'
          : 'cursor-not-allowed border-white/5 bg-white/[0.02] opacity-60',
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            item.enabled ? 'bg-white/10' : 'bg-white/5',
          )}
        >
          <Icon
            className={cx('h-5 w-5', item.enabled ? 'text-white/70' : 'text-white/30')}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm text-white">{item.title}</span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/60">
              {item.subtitle}
            </span>
            {!item.enabled ? (
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/50">
                即將推出
              </span>
            ) : null}
          </div>
          <div className="text-xs text-white/50">{item.description}</div>
        </div>

        {item.enabled ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
        ) : null}
      </div>
    </button>
  );
}
