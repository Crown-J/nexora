// apps/nx-ui/src/app/dashboard/inventory-mobile/transfer/page.tsx
// TASK-BUSINESS-RESTRUCTURE Phase 6:庫存中心手機版 · 調撥清單入口。
// 臨時路徑,Phase 8 庫存中心 4 分區重構時會遷至 workstation 子節點。

import { MobileTransferListPage } from '@/features/inventory-mobile/transfer/MobileTransferListPage';

export default function InventoryMobileTransferRoute() {
  return <MobileTransferListPage />;
}
