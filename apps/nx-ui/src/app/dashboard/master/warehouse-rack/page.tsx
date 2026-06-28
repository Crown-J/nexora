// apps/nx-ui/src/app/dashboard/master/warehouse-rack/page.tsx
// 五層倉儲 貨架基本資料（通用主檔模板 EntityMasterPage）；後端 nx01/warehouse-racks 本軌新建

'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { WAREHOUSE_RACK_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function WarehouseRackPage() {
  return <EntityMasterPage config={WAREHOUSE_RACK_MASTER} />;
}
