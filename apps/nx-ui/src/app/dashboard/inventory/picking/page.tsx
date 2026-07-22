// apps/nx-ui/src/app/dashboard/inventory/picking/page.tsx
// 撿貨＝工作池（SALES-FLOW 階段 1、2026-07-22 D1）：取代舊「新增撿貨單」清單。
// 撿貨為手機/平板作業（倉管走動）；此頁響應式、桌機亦可檢視。

import { MobilePickPoolPage } from '@/features/nx03/workstation/picking/MobilePickPoolPage';

export default function InventoryPickingRoute() {
  return <MobilePickPoolPage />;
}
