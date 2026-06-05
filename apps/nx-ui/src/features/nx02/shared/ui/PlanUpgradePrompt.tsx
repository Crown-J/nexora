/**
 * File: apps/nx-ui/src/features/nx02/shared/ui/PlanUpgradePrompt.tsx
 * Project: NEXORA (Monorepo)
 *
 * [4-1] 2026-06-05：NX-MANUAL-02 v2.0 §④ 對齊：
 * 套件 / 高版本功能對 LITE 客戶「隱藏不顯示、不是反灰」。
 *
 * 此元件原為「LITE 客戶顯示 PLUS 升級提示卡」、現改為直接 redirect 回首頁、不再渲染推銷文案。
 * Props 保留供既有 caller 通過 TypeScript、值不再使用（NX02-SHR-UI-002）。
 *
 * 影響 callers：
 * - nx02 套件鎖頭頁（transfer/shortage/auto-replenish）
 * - nx01 PoLiteAware（採購單 PLUS 鎖）
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type PlanUpgradePromptProps = {
  requiredPlan?: string;
  /** 左上角小標，例如 NX02 / NX01 */
  kicker?: string;
  /** 覆寫標題；不再使用 */
  title?: string;
  /** 覆寫說明文案；不再使用 */
  description?: string;
};

/**
 * @FUNCTION_CODE NX02-SHR-UI-002-F01
 */
export function PlanUpgradePrompt(_: PlanUpgradePromptProps = {}) {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return null;
}
