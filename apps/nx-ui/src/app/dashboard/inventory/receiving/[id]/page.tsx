// apps/nx-ui/src/app/dashboard/inventory/receiving/[id]/page.tsx
// v1.2 階段 G P5：驗收詳情入口（掃條碼模式）
'use client';

import { use } from 'react';

import { MobileReceivingDetailPage } from '@/features/nx03/workstation/receiving/MobileReceivingDetailPage';

export default function InventoryReceivingDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MobileReceivingDetailPage id={id} />;
}
