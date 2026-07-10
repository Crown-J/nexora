// apps/nx-ui/src/app/dashboard/inventory/transfer/page.tsx
// NX04-QT-SHELL：調撥單入口——桌面=單據模板 StWorkbench、手機=調撥工作站（響應式分流）。

import { TransferRouteSwitch } from './TransferRouteSwitch';

export default function InventoryTransferRoute() {
  return <TransferRouteSwitch />;
}
