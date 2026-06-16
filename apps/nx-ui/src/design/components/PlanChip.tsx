// apps/nx-ui/src/shared/ui/PlanChip.tsx
/**
 * NEXORA 訂閱方案 chip（業界改革 #22 v1.1、Top bar tenant 識別載體）
 *
 * 範式：GitHub 風格 minimal 灰底 chip（對齊 GitHub Pro / Team / Enterprise badge）
 * - 所有 plan 用相同 chip 樣式、僅文字不同（不依 plan 變色）
 * - 對齊 NEXORA dark theme 紀律：amber 主色僅留主要 action
 * - 與 VersionBadge（hub 卡片版本門檻、PLUS 冷藍／PRO 暖琥珀）不同範式：
 *   * VersionBadge = 強調卡片版本需求差異（彩色）
 *   * PlanChip = 揭露用戶目前方案（中性）
 */

import { cn } from '@design/utils/cn';

export type PlanChipPlan = 'LITE' | 'PLUS' | 'PRO';

type PlanChipProps = {
  plan: PlanChipPlan | null | undefined;
  className?: string;
};

/**
 * Top bar / 用戶資訊區揭露當前 plan 的 chip。
 * - null / undefined 時不渲染（避免 layout shift）
 */
export function PlanChip({ plan, className }: PlanChipProps) {
  if (!plan) return null;
  return (
    <span
      aria-label={`目前方案：${plan}`}
      title={`目前方案：${plan}`}
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5',
        'border-border/60 bg-secondary/60 text-foreground/85',
        'text-[10px] font-semibold leading-none tracking-[0.12em] tabular-nums',
        'select-none',
        className,
      )}
    >
      {plan}
    </span>
  );
}
