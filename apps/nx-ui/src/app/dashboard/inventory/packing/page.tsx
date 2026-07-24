// apps/nx-ui/src/app/dashboard/inventory/packing/page.tsx
// 包貨台兩區看板（WMS 2026-07-24）：左已撿貨池、右自取/寄貨/配送三區建箱。

import { PackingBoard } from '@/features/nx03/workstation/packing/PackingBoard';

export default function InventoryPackingRoute() {
  return <PackingBoard />;
}
