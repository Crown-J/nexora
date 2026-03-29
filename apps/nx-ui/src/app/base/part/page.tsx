'use client';

import { BaseMasterSubPageLayout } from '@/features/base/shell/BaseMasterSubPageLayout';
import { BasePartMasterView } from '@/features/base/part/BasePartMasterView';

export default function BasePartPage() {
  return (
    <BaseMasterSubPageLayout
      title="零件主檔"
      description="料號、規格與狀態（目前為前端 mock，未接 API）。"
    >
      <BasePartMasterView />
    </BaseMasterSubPageLayout>
  );
}
