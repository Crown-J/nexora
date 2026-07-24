// apps/nx-ui/src/app/dashboard/inventory/packing/page.tsx
// 包貨台＝標準單據頁（WMS 2026-07-24）：包裹列表 + 工具列 + 兩分頁；新增彈 5 步精靈組包裹。

import { PackageWorkbench } from '@/features/nx03/workstation/packing/PackageWorkbench';

export default function InventoryPackingRoute() {
  return <PackageWorkbench />;
}
