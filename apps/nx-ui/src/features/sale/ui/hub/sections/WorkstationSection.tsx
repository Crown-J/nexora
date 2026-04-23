// apps/nx-ui/src/features/sale/ui/hub/sections/WorkstationSection.tsx
/**
 * R7 銷售中心手機版「工作站」分區。
 *
 * 4 個作業項目（spec PART 5）：
 *   - 國內銷售（enabled，→ R6 SOP 工作台）
 *   - 國外銷售（placeholder）
 *   - 銷退作業（placeholder）
 *   - 保固申請（placeholder）
 *
 * disabled 項目：降低透明度 + 加「即將推出」badge + 點擊無反應。
 */

'use client';

import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, Globe, Package, Shield, Undo2 } from 'lucide-react';

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
    id: 'domestic',
    Icon: Package,
    title: '國內銷售',
    subtitle: '9 步驟 SOP 流程',
    description: '從選客戶到訂單成立',
    route: '/dashboard/sale/sop-demo',
    enabled: true,
  },
  {
    id: 'export',
    Icon: Globe,
    title: '國外銷售',
    subtitle: '12 步驟（含報關／物流）',
    description: '出口銷售完整流程',
    route: '/dashboard/sale/export',
    enabled: false,
  },
  {
    id: 'return',
    Icon: Undo2,
    title: '銷退作業',
    subtitle: '客戶退貨處理流程',
    description: '退貨入庫與帳款處理',
    route: '/dashboard/sale/return',
    enabled: false,
  },
  {
    id: 'warranty',
    Icon: Shield,
    title: '保固申請',
    subtitle: '客戶保固送修流程',
    description: '送原廠或同行處理',
    route: '/dashboard/sale/warranty',
    enabled: false,
  },
];

export function WorkstationSection() {
  const router = useRouter();

  return (
    <div className="space-y-4 px-4 pt-4">
      <header className="space-y-1">
        <h1 className="text-lg text-white">銷售中心 · 工作站</h1>
        <p className="text-xs text-white/50">進入作業流程</p>
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
            {!item.enabled ? (
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/50">
                即將推出
              </span>
            ) : null}
          </div>
          <div className="text-xs text-white/60">{item.subtitle}</div>
          <div className="mt-0.5 text-xs text-white/40">{item.description}</div>
        </div>

        {item.enabled ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
        ) : null}
      </div>
    </button>
  );
}
