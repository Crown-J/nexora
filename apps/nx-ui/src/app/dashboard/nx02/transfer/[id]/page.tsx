// apps/nx-ui/src/app/dashboard/nx02/transfer/[id]/page.tsx
// T1-fix-c 進貨對齊批次 2026-06-07：拿掉 PlanUpgradePrompt 版本守。
'use client';

import { useParams } from 'next/navigation';

import { useTransferDoc } from '@/features/nx02/transfer/hooks/useTransfer';
import { TransferFormView } from '@/features/nx02/transfer/ui/TransferFormView';

export default function Nx02TransferDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const vm = useTransferDoc(id || undefined);
  return <TransferFormView vm={vm} isNew={false} />;
}
