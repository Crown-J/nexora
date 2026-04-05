/**
 * File: apps/nx-ui/src/app/dashboard/nx02/balance/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 庫存一覽（QUERY）
 */

'use client';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { useBalance } from '@/features/nx02/balance/hooks/useBalance';
import { BalanceView } from '@/features/nx02/balance/ui/BalanceView';
import { planSupportsNx02PlusFeatures } from '@/shared/lib/plan-plus-support';

export default function Nx02BalancePage() {
  const { planCode } = useSessionMe();
  const vm = useBalance();
  return <BalanceView vm={vm} showPlus={planSupportsNx02PlusFeatures(planCode)} />;
}
