// apps/nx-ui/src/app/dashboard/inventory/picking/page.tsx
// 撿貨作業（SALES-FLOW 撿貨重設計）：響應式分流——窄螢幕手機版(選卡+dock)、桌機電腦版(行內操作)。

import { PickingRouteSwitch } from './PickingRouteSwitch';

export default function InventoryPickingRoute() {
  return <PickingRouteSwitch />;
}
