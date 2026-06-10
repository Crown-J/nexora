// apps/nx-ui/src/app/dashboard/nx02/transfer/new/page.tsx
// T1-fix-c 進貨對齊批次 2026-06-07：拿掉 PlanUpgradePrompt 版本守。
'use client';

import { useTransferDoc } from '@/features/nx03/transfer/hooks/useTransfer';
import { TransferFormView } from '@/features/nx03/transfer/ui/TransferFormView';

export default function Nx02TransferNewPage() {
  const vm = useTransferDoc(undefined);
  return <TransferFormView vm={vm} isNew />;
}
