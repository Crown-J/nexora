/**
 * File: apps/nx-ui/src/shared/lib/plan-plus-support.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 與 nx-api `planSupportsNx02PlusFeatures` 對齊：nx99_plan.code 為 NEXORA-PLUS 等
 *
 * @FUNCTION_CODE NX00-PLN-UI-001-F01
 */

/**
 * @FUNCTION_CODE NX00-PLN-UI-001-F01
 */
export function planSupportsNx02PlusFeatures(planCode: string | null | undefined): boolean {
  const p = (planCode ?? '').trim().toUpperCase();
  if (!p) return false;
  return (
    p === 'PLUS' ||
    p === 'PRO' ||
    p === 'NEXORA-PLUS' ||
    p === 'NEXORA-PRO' ||
    p === 'NEXORA-ENTERPRISE'
  );
}
