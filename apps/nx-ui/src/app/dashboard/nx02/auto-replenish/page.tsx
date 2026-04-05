/**
 * File: apps/nx-ui/src/app/dashboard/nx02/auto-replenish/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 自動補貨設定（PLUS）
 */

'use client';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { PlanUpgradePrompt } from '@/features/nx02/shared/ui/PlanUpgradePrompt';
import { useAutoReplenish } from '@/features/nx02/auto-replenish/hooks/useAutoReplenish';
import { AutoReplenishSplitView } from '@/features/nx02/auto-replenish/ui/AutoReplenishSplitView';
import { planSupportsNx02PlusFeatures } from '@/shared/lib/plan-plus-support';

export default function Nx02AutoReplenishPage() {
  const { planCode } = useSessionMe();
  const vm = useAutoReplenish();
  if (!planSupportsNx02PlusFeatures(planCode)) {
    return <PlanUpgradePrompt requiredPlan="PLUS" />;
  }
  return <AutoReplenishSplitView vm={vm} />;
}
