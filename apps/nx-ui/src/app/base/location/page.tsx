'use client';

import { BaseMasterSubPageLayout } from '@/features/base/shell/BaseMasterSubPageLayout';
import { BaseWarehouseLocationView } from '@/features/base/location/BaseWarehouseLocationView';

export default function BaseLocationPage() {
  return (
    <BaseMasterSubPageLayout
      title="倉庫主檔"
      description="倉別（GET/POST/PUT /warehouse）與庫位（GET/POST/PATCH /location），資料與資料庫 nx00_warehouse／nx00_location 一致。"
    >
      <BaseWarehouseLocationView />
    </BaseMasterSubPageLayout>
  );
}
