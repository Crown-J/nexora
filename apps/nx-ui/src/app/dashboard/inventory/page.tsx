/**
 * 庫存中心首頁（路由 v2：`/dashboard/inventory`）
 * 版型對齊採購中心 Hub；統計仍走 NX02 dashboard API。
 */

import { InventoryCenterHub } from '@/features/inventory/ui/InventoryCenterHub';

export default function InventoryHubPage() {
  return <InventoryCenterHub />;
}
