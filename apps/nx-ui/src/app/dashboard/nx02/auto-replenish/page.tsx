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

function isPlusPlan(code: string | null | undefined): boolean {
  const p = (code ?? '').trim().toUpperCase();
  return p === 'PLUS' || p === 'PRO';
}

export default function Nx02AutoReplenishPage() {
  const { me } = useSessionMe();
  const vm = useAutoReplenish();
  if (!isPlusPlan(me?.plan_code)) {
    return <PlanUpgradePrompt requiredPlan="PLUS" />;
  }
  return <AutoReplenishSplitView vm={vm} />;
}
