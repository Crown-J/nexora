// apps/nx-ui/src/app/dashboard/nx02/auto-replenish/page.tsx
// T1-fix-c 進貨對齊批次 2026-06-07：拿掉 PlanUpgradePrompt 版本守、自動補貨三版本一致。
'use client';

import { useAutoReplenish } from '@/features/nx02/auto-replenish/hooks/useAutoReplenish';
import { AutoReplenishSplitView } from '@/features/nx02/auto-replenish/ui/AutoReplenishSplitView';

export default function Nx02AutoReplenishPage() {
  const vm = useAutoReplenish();
  return <AutoReplenishSplitView vm={vm} />;
}
