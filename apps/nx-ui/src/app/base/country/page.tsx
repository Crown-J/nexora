'use client';

import { BaseMasterSubPageLayout } from '@/features/base/shell/BaseMasterSubPageLayout';
import { BaseCountryMasterView } from '@/features/base/country/BaseCountryMasterView';

export default function BaseCountryPage() {
  return (
    <BaseMasterSubPageLayout
      title="國家主檔"
      description="nx00_country（docs/nx00_field.csv）。列表含業務欄位與稽核；不顯示系統 id。"
    >
      <BaseCountryMasterView />
    </BaseMasterSubPageLayout>
  );
}