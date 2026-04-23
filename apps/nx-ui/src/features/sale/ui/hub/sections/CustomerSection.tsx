// apps/nx-ui/src/features/sale/ui/hub/sections/CustomerSection.tsx
/**
 * R7 銷售中心手機版「客戶維護」分區。
 *
 * 3 個子功能（spec PART 7）：
 *   - 客戶分析報表（業務用）
 *   - 客戶分級管理（業務組長用）
 *   - 客戶資料維護（業務用）
 *
 * 全部 enabled=false（Phase 4 只做 placeholder）。
 * 每個項目含「角色 badge」，呼應「中心 = 角色工作台」哲學。
 */

'use client';

import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Award, BarChart3, User } from 'lucide-react';

import { cx } from '@/shared/lib/cx';

interface CustomerItemDef {
  id: string;
  Icon: LucideIcon;
  title: string;
  /** 角色 badge 文字：業務用 / 業務組長用 / ... */
  role: string;
  description: string;
  detail: string;
  route: string;
  enabled: boolean;
}

const ITEMS: readonly CustomerItemDef[] = [
  {
    id: 'analysis',
    Icon: BarChart3,
    title: '客戶分析報表',
    role: '業務用',
    description: '掌握客戶成長',
    detail: '銷售 / 銷退 / 趨勢',
    route: '/dashboard/sale/customer/analysis',
    enabled: false,
  },
  {
    id: 'grading',
    Icon: Award,
    title: '客戶分級管理',
    role: '業務組長用',
    description: '設定客戶等級',
    detail: 'A / B / C / D 升降級',
    route: '/dashboard/sale/customer/grading',
    enabled: false,
  },
  {
    id: 'info',
    Icon: User,
    title: '客戶資料維護',
    role: '業務用',
    description: '更新基本資訊',
    detail: '地址 / 聯絡 / 備註',
    route: '/dashboard/sale/customer/info',
    enabled: false,
  },
];

export function CustomerSection() {
  const router = useRouter();

  return (
    <div className="space-y-4 px-4 pt-4">
      <header className="space-y-1">
        <h1 className="text-lg text-white">銷售中心 · 客戶維護</h1>
        <p className="text-xs text-white/50">維護客戶資料與分析業績</p>
      </header>

      <div className="space-y-3">
        {ITEMS.map((item) => (
          <CustomerItem
            key={item.id}
            item={item}
            onClick={() => item.enabled && router.push(item.route)}
          />
        ))}
      </div>
    </div>
  );
}

interface CustomerItemProps {
  item: CustomerItemDef;
  onClick: () => void;
}

function CustomerItem({ item, onClick }: CustomerItemProps) {
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
      </div>
    </button>
  );
}
