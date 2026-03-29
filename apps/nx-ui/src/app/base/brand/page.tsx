'use client';

import { BaseMasterSubPageLayout } from '@/features/base/shell/BaseMasterSubPageLayout';
import { BaseBrandMasterView } from '@/features/base/brand/BaseBrandMasterView';

export default function BaseBrandPage() {
  return (
    <BaseMasterSubPageLayout
      title="廠牌主檔"
      description="汽車與零件廠牌分頁維護（目前為前端 mock，未接 API）。"
    >
      <BaseBrandMasterView />
    </BaseMasterSubPageLayout>
  );
}
