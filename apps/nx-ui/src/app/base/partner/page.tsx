'use client';

import { BaseMasterSubPageLayout } from '@/features/base/shell/BaseMasterSubPageLayout';
import { BasePartnerMasterView } from '@/features/base/partner/BasePartnerMasterView';

export default function BasePartnerPage() {
  return (
    <BaseMasterSubPageLayout
      title="廠商與客戶"
      description="廠商／客戶分頁維護（目前為前端 mock，未接 API）。"
    >
      <BasePartnerMasterView />
    </BaseMasterSubPageLayout>
  );
}
