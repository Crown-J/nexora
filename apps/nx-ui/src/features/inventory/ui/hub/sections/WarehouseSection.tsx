// apps/nx-ui/src/features/inventory/ui/hub/sections/WarehouseSection.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 8~10:庫存中心手機版「倉位管理」分區。
 *
 * 取代銷售中心的「客戶維護」——倉管不接觸客戶,改以倉位/盤點設定為第 4 分區。
 *
 * 2 個子功能(Phase 10 已接頁面):
 *   - 庫位管理:建議安全量 / 最高量(坪效),採購實際設定比對
 *   - 盤點設定:週期(月/季/半年/年)+ 分區盤點 + 高價品頻率
 *
 * 每個項目含「角色 badge」,呼應「中心 = 角色工作台」。
 */

'use client';

import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, MapPin, Settings } from 'lucide-react';

import { cx } from '@/shared/lib/cx';

interface WarehouseItemDef {
  id: string;
  Icon: LucideIcon;
  title: string;
  role: string;
  description: string;
  detail: string;
  route: string;
  enabled: boolean;
}

const ITEMS: readonly WarehouseItemDef[] = [
  {
    id: 'locations',
    Icon: MapPin,
    title: '庫位管理',
    role: '倉管員',
    description: '各庫位存放料號 + 坪效建議',
    detail: '安全量 / 最高量(採購實際設定比對)',
    route: '/dashboard/inventory/warehouse/locations',
    enabled: true,
  },
  {
    id: 'stocktake-config',
    Icon: Settings,
    title: '盤點設定',
    role: '倉管主管',
    description: '盤點週期與範圍設定',
    detail: '月 / 季 / 半年 / 年 · 分區盤點 · 高價品頻率',
    route: '/dashboard/inventory/warehouse/stocktake-config',
    enabled: true,
  },
];

export function WarehouseSection() {
  const router = useRouter();

  return (
    <div className="space-y-4 px-4 pt-4">
      <header className="space-y-1">
        <h1 className="text-lg text-white">庫存中心 · 倉位管理</h1>
        <p className="text-xs text-white/50">管理庫位坪效與盤點設定</p>
      </header>

      <div className="space-y-3">
        {ITEMS.map((item) => (
          <WarehouseItem
            key={item.id}
            item={item}
            onClick={() => item.enabled && router.push(item.route)}
          />
        ))}
      </div>
    </div>
  );
}

interface WarehouseItemProps {
  item: WarehouseItemDef;
  onClick: () => void;
}

function WarehouseItem({ item, onClick }: WarehouseItemProps) {
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
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-sm text-white">{item.title}</span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/60">
              {item.role}
            </span>
            {!item.enabled ? (
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/50">
                即將推出
              </span>
            ) : null}
          </div>
          <div className="text-xs text-white/60">{item.description}</div>
          <div className="mt-0.5 text-xs text-white/40">{item.detail}</div>
        </div>

        {item.enabled ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
        ) : null}
      </div>
    </button>
  );
}
