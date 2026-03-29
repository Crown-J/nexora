'use client';

import { BaseMasterSubPageLayout } from '@/features/base/shell/BaseMasterSubPageLayout';
import { BaseWarehouseLocationView } from '@/features/base/location/BaseWarehouseLocationView';

export default function BaseLocationPage() {
  return (
    <BaseMasterSubPageLayout
      title="倉庫主檔"
      description="倉別與旗下庫位（目前為前端 mock，未接 API）。"
    >
      <BaseWarehouseLocationView />
    </BaseMasterSubPageLayout>
  );
}
