// apps/nx-ui/src/app/dashboard/inventory/receiving/page.tsx
// v1.2 階段 G P5：驗收清單入口（接 nx03/inbound GRN、Q4=a 拍板）
'use client';

import { MobileReceivingListPage } from '@/features/nx03/workstation/receiving/MobileReceivingListPage';

export default function InventoryReceivingRoute() {
  return <MobileReceivingListPage />;
}
