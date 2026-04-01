'use client';

import { BaseMasterSubPageLayout } from '@/features/base/shell/BaseMasterSubPageLayout';
import { BasePartRelationMasterView } from '@/features/base/part-relation/BasePartRelationMasterView';

export default function BasePartRelationPage() {
  return (
    <BaseMasterSubPageLayout
      title="零件關聯"
      description="nx00_part_relation。列表顯示料號／品名；維護時請輸入來源／目的零件內碼（與零件主檔 id 相同）。"
    >
      <BasePartRelationMasterView />
    </BaseMasterSubPageLayout>
  );
}