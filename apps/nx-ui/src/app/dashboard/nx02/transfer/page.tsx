/**
 * File: apps/nx-ui/src/app/dashboard/nx02/transfer/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 調撥單列表（PLUS）
 */

'use client';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { PlanUpgradePrompt } from '@/features/nx02/shared/ui/PlanUpgradePrompt';
import { useTransferList } from '@/features/nx02/transfer/hooks/useTransfer';
import { TransferListView } from '@/features/nx02/transfer/ui/TransferListView';
import { planSupportsNx02PlusFeatures } from '@/shared/lib/plan-plus-support';

export default function Nx02TransferListPage() {
  const { planCode } = useSessionMe();
  const vm = useTransferList();
  if (!planSupportsNx02PlusFeatures(planCode)) {
    return <PlanUpgradePrompt requiredPlan="PLUS" />;
  }
  return <TransferListView vm={vm} />;
}
