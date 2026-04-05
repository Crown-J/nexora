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

function isPlusPlan(code: string | null | undefined): boolean {
  const p = (code ?? '').trim().toUpperCase();
  return p === 'PLUS' || p === 'PRO';
}

export default function Nx02ShortagePage() {
  const { me } = useSessionMe();
  const vm = useShortage();
  if (!isPlusPlan(me?.plan_code)) {
    return <PlanUpgradePrompt requiredPlan="PLUS" />;
  }
  return <ShortageView vm={vm} />;
}
