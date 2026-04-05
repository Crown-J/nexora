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
};

/**
 * @FUNCTION_CODE NX02-SHR-UI-002-F01
 */
export function PlanUpgradePrompt({ requiredPlan = 'PLUS' }: PlanUpgradePromptProps) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-6 py-8 text-center">
      <p className="text-xs tracking-[0.35em] text-muted-foreground">NX02</p>
      <h1 className="mt-2 text-xl font-semibold text-foreground">需要 {requiredPlan} 方案</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        此功能僅開放給 PLUS 或 PRO 方案。若需使用調撥、缺貨簿與自動補貨等進階庫存作業，請升級方案後再試。
      </p>
    </div>
  );
}
