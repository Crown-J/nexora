/**
 * File: apps/nx-ui/src/app/dashboard/nx02/transfer/[id]/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 調撥單明細（PLUS）
 */

'use client';

import { useParams } from 'next/navigation';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { PlanUpgradePrompt } from '@/features/nx02/shared/ui/PlanUpgradePrompt';
import { useTransferDoc } from '@/features/nx02/transfer/hooks/useTransfer';
import { TransferFormView } from '@/features/nx02/transfer/ui/TransferFormView';

function isPlusPlan(code: string | null | undefined): boolean {
  const p = (code ?? '').trim().toUpperCase();
  return p === 'PLUS' || p === 'PRO';
}

export default function Nx02TransferDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { me } = useSessionMe();
  const vm = useTransferDoc(id || undefined);
  if (!isPlusPlan(me?.plan_code)) {
    return <PlanUpgradePrompt requiredPlan="PLUS" />;
  }
  return <TransferFormView vm={vm} isNew={false} />;
}
