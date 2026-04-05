/**
 * File: apps/nx-ui/src/app/dashboard/nx02/shortage/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 缺貨簿（PLUS）
 */

'use client';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { PlanUpgradePrompt } from '@/features/nx02/shared/ui/PlanUpgradePrompt';
import { useShortage } from '@/features/nx02/shortage/hooks/useShortage';
import { ShortageView } from '@/features/nx02/shortage/ui/ShortageView';
import { planSupportsNx02PlusFeatures } from '@/shared/lib/plan-plus-support';

export default function Nx02ShortagePage() {
  const { planCode } = useSessionMe();
  const vm = useShortage();
  if (!planSupportsNx02PlusFeatures(planCode)) {
    return <PlanUpgradePrompt requiredPlan="PLUS" />;
  }
  return <ShortageView vm={vm} />;
}
