/**
 * File: apps/nx-api/src/shared/plan/plan-plus-support.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 判斷訂閱方案是否可使用 NX02 PLUS 級功能（調撥／缺貨簿／自動補貨等）
 *
 * Notes:
 * - nx99_plan.code 為 NEXORA-LITE、NEXORA-PLUS、NEXORA-PRO…，與簡寫 LITE／PLUS 並存
 * - @FUNCTION_CODE NX00-PLN-SHR-001-F01
 */

/**
 * @FUNCTION_CODE NX00-PLN-SHR-001-F01
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
