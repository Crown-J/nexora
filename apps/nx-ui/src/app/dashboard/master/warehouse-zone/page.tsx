// apps/nx-ui/src/app/dashboard/master/warehouse-zone/page.tsx
// 五層倉儲 區域基本資料（通用主檔模板 EntityMasterPage）；後端 nx01/warehouse-zones 既有

'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { WAREHOUSE_ZONE_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function WarehouseZonePage() {
  return <EntityMasterPage config={WAREHOUSE_ZONE_MASTER} />;
}
