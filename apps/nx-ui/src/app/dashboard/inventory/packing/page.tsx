// apps/nx-ui/src/app/dashboard/inventory/packing/page.tsx
// 包貨＝包貨台工作檯（SALES-FLOW 階段 2、2026-07-22 D2）：取代舊「新增包貨單」清單。
// 以客戶為單位、預設一箱一單、同客戶小件可併箱、封箱。平板/桌機、響應式。

import { PackingWorkbench } from '@/features/nx03/workstation/packing/PackingWorkbench';

export default function InventoryPackingRoute() {
  return <PackingWorkbench />;
}
