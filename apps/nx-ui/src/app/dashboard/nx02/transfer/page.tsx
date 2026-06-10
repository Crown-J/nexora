// apps/nx-ui/src/app/dashboard/nx02/transfer/page.tsx
// T1-fix-c 進貨對齊批次 2026-06-07：拿掉 PlanUpgradePrompt 版本守、調撥單三版本一致。
'use client';

import { useTransferList } from '@/features/nx03/transfer/hooks/useTransfer';
import { TransferListView } from '@/features/nx03/transfer/ui/TransferListView';

export default function Nx02TransferListPage() {
  const vm = useTransferList();
  return <TransferListView vm={vm} />;
}
