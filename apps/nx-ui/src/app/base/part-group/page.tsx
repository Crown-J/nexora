'use client';

import { BaseMasterSubPageLayout } from '@/features/base/shell/BaseMasterSubPageLayout';
import { BasePartGroupApiMasterView } from '@/features/base/part-group/BasePartGroupApiMasterView';

export default function BasePartGroupPage() {
  return (
    <BaseMasterSubPageLayout
      title="零件族群主檔"
      description="nx00_part_group（docs/nx00_field.csv）：code、name、sort、啟用與稽核。"
    >
      <BasePartGroupApiMasterView />
    </BaseMasterSubPageLayout>
  );
}
