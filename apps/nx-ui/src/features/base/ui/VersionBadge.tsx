// apps/nx-ui/src/features/base/ui/VersionBadge.tsx
/**
 * 主檔卡片版本門檻 badge（NEXORA 三版本可見性策略、業界改革 #22）
 *
 * - LITE 卡片不渲染（無 badge = 全版本可見）
 * - PLUS 卡片渲染冷色（sky blue、副品牌）
 * - PRO  卡片渲染暖色（amber、NEXORA 主品牌）
 *
 * 視覺：右上角小 pill、10px、uppercase、tabular-nums、subtle 透明背景
 * 對齊：docs/_team/task-master-data-center-audit.md §8.2 三版本可見性策略
 */

'use client';

import { cn } from '@/lib/utils';
import type { MasterHubMinPlan } from '@/features/base/config/master-cards';

type VersionBadgeProps = {
  plan: MasterHubMinPlan | undefined;
  className?: string;
};

const PLAN_STYLE: Record<Exclude<MasterHubMinPlan, 'LITE'>, string> = {
  PLUS: 'border-[#5BA4FF]/40 bg-[#5BA4FF]/10 text-[#5BA4FF]',
  PRO: 'border-[#E8A020]/50 bg-[#E8A020]/14 text-[#E8A020]',
};

/**
 * 主檔版本 badge。
 * - 未指定 / 'LITE' 時回傳 null（不佔位、不影響佈局）
 */
export function VersionBadge({ plan, className }: VersionBadgeProps) {
  if (!plan || plan === 'LITE') return null;
  return (
    <span
      aria-label={`需 ${plan} 版`}
      title={`需 ${plan} 版`}
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5',
        'text-[10px] font-semibold leading-none tracking-[0.12em] tabular-nums',
        'select-none',
        PLAN_STYLE[plan],
        className,
      )}
    >
      {plan}
    </span>
  );
}
