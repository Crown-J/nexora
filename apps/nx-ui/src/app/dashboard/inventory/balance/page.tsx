// apps/nx-ui/src/app/dashboard/inventory/balance/page.tsx
// T1-fix-c 進貨對齊批次 2026-06-07：拿掉 showPlus prop、庫存一覽三版本一致。
'use client';

import { useBalance } from '@/features/nx03/balance/hooks/useBalance';
import { BalanceView } from '@/features/nx03/balance/ui/BalanceView';

export default function Nx02BalancePage() {
  const vm = useBalance();
  return <BalanceView vm={vm} />;
}
