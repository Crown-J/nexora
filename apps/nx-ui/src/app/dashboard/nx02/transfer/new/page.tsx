/**
 * File: apps/nx-ui/src/app/dashboard/nx02/transfer/new/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 新增調撥單（PLUS）
 */

'use client';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { PlanUpgradePrompt } from '@/features/nx02/shared/ui/PlanUpgradePrompt';
import { useTransferDoc } from '@/features/nx02/transfer/hooks/useTransfer';
import { TransferFormView } from '@/features/nx02/transfer/ui/TransferFormView';
import { planSupportsNx02PlusFeatures } from '@/shared/lib/plan-plus-support';

export default function Nx02TransferNewPage() {
  const { planCode } = useSessionMe();
  const vm = useTransferDoc(undefined);
  if (!planSupportsNx02PlusFeatures(planCode)) {
    return <PlanUpgradePrompt requiredPlan="PLUS" />;
  }
  return <TransferFormView vm={vm} isNew />;
}
