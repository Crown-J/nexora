// apps/nx-ui/src/app/dashboard/inventory/picking/page.tsx
// 撿貨作業（WMS P2 撿貨三欄看板）：電腦左中右三欄、手機三分頁；點卡選取 + 底部 dock。

import { PickBoard } from '@/features/nx03/workstation/picking/PickBoard';

export default function InventoryPickingRoute() {
  return <PickBoard />;
}
