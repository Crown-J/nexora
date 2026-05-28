// apps/nx-ui/src/app/dashboard/inventory/warehouse/locations/page.tsx
// NX03-STOCK-LITE M3-2：庫位設定路由（取代 mobile-only mock 版本）
//
// 桌面版改走真實 /nx01/locations API。
// 既有 Mobile 版（MobileLocationListPage）暫保留為 FU、本軌不動。

import { LocationsView } from '@/features/inventory/locations/LocationsView';

export default function InventoryLocationsRoute() {
  return <LocationsView />;
}
