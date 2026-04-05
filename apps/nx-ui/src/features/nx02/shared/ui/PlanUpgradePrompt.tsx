/**
 * File: apps/nx-ui/src/features/nx02/shared/ui/PlanUpgradePrompt.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-SHR-UI-002：LITE 方案顯示 PLUS 升級提示（不顯示功能內容）
 *
 * @FUNCTION_CODE NX02-SHR-UI-002-F01
 */

'use client';

export type PlanUpgradePromptProps = {
  requiredPlan?: string;
  /** 左上角小標，例如 NX02 / NX01 */
  kicker?: string;
  /** 覆寫標題；未傳則為「需要 {requiredPlan} 方案」 */
  title?: string;
  /** 覆寫說明文案 */
  description?: string;
};

/**
 * @FUNCTION_CODE NX02-SHR-UI-002-F01
 */
export function PlanUpgradePrompt({
  requiredPlan = 'PLUS',
  kicker = 'NX02',
  title,
  description,
}: PlanUpgradePromptProps) {
  const resolvedTitle = title ?? `需要 ${requiredPlan} 方案`;
  const resolvedDescription =
    description ??
    '此功能僅開放給 PLUS 或 PRO 方案。若需使用調撥、缺貨簿與自動補貨等進階庫存作業，請升級方案後再試。';

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-6 py-8 text-center">
      <p className="text-xs tracking-[0.35em] text-muted-foreground">{kicker}</p>
      <h1 className="mt-2 text-xl font-semibold text-foreground">{resolvedTitle}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{resolvedDescription}</p>
    </div>
  );
}
