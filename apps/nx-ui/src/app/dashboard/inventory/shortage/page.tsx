// apps/nx-ui/src/app/dashboard/inventory/shortage/page.tsx
// T1-fix-c 進貨對齊批次 2026-06-07：拿掉 PlanUpgradePrompt 版本守、缺貨簿三版本一致。
'use client';

import { useShortage } from '@/features/nx03/shortage/hooks/useShortage';
import { ShortageView } from '@/features/nx03/shortage/ui/ShortageView';

export default function Nx02ShortagePage() {
  const vm = useShortage();
  return <ShortageView vm={vm} />;
}
