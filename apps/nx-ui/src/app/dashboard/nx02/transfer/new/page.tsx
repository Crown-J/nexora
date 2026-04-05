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

function isPlusPlan(code: string | null | undefined): boolean {
  const p = (code ?? '').trim().toUpperCase();
  return p === 'PLUS' || p === 'PRO';
}

export default function Nx02TransferNewPage() {
  const { me } = useSessionMe();
  const vm = useTransferDoc(undefined);
  if (!isPlusPlan(me?.plan_code)) {
    return <PlanUpgradePrompt requiredPlan="PLUS" />;
  }
  return <TransferFormView vm={vm} isNew />;
}
