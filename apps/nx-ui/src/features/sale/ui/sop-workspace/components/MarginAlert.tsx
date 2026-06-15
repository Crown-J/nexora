// apps/nx-ui/src/features/sale/ui/sop-workspace/components/MarginAlert.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 2:S04 售價輸入時的毛利警覺性卡片。
 *
 * Crown 設計意圖:讓業務在輸入售價時即時看到毛利狀態,避免無意識砍價。
 *   ✓ 達標(actual >= target)    → 綠色 #1D9E75
 *   ⚠ 略低(target-5 <= actual < target) → 金色 #E8A020
 *   ✗ 過低(actual < target-5)   → 紅色 #E24B4A
 *
 * 同時顯示系統建議售價 = cost × (1 + target/100),讓業務有個參考點。
 */

'use client';

import { cx } from '@design/utils/cx';
import { TIER_TARGET_MARGIN } from '@/features/sale/ui/inquiry/types';
import type { CustomerTier } from '../types';

interface MarginAlertProps {
  tier: CustomerTier;
  /** 進貨成本(不含稅單價) */
  cost: number;
  /** 業務輸入的實際售價 */
  finalPrice: number;
}

export function MarginAlert({ tier, cost, finalPrice }: MarginAlertProps) {
  const targetMargin = TIER_TARGET_MARGIN[tier];
  const suggestedPrice = Math.round(cost * (1 + targetMargin / 100));

  const safeFinal = Math.max(0, finalPrice);
  const actualMargin =
    safeFinal > 0 ? ((safeFinal - cost) / safeFinal) * 100 : 0;

  const status: 'good' | 'warning' | 'danger' =
    actualMargin >= targetMargin
      ? 'good'
      : actualMargin >= targetMargin - 5
        ? 'warning'
        : 'danger';

  const statusColor =
    status === 'good'
      ? 'text-[#1D9E75]'
      : status === 'warning'
        ? 'text-[#E8A020]'
        : 'text-[#E24B4A]';

  const statusLabel =
    status === 'good'
      ? '✓ 達標'
      : status === 'warning'
        ? '⚠ 略低'
        : '✗ 過低';

  return (
    <div className="space-y-1 rounded border border-white/10 bg-white/5 p-2 text-xs">
      <div className="flex justify-between">
        <span className="text-white/50">系統建議售價</span>
        <span className="text-white/80 tabular-nums">
          NT$ {suggestedPrice.toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/50">{tier} 級目標毛利</span>
        <span className="text-white/80 tabular-nums">{targetMargin}%</span>
      </div>
      <div className="flex justify-between pt-0.5">
        <span className="text-white/50">目前毛利</span>
        <span className={cx('tabular-nums', statusColor)}>
          {actualMargin.toFixed(1)}% {statusLabel}
        </span>
      </div>
    </div>
  );
}
