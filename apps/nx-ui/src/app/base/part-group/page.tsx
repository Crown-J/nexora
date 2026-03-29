'use client';

import { BaseMasterSubPageLayout } from '@/features/base/shell/BaseMasterSubPageLayout';
import { BasePartGroupMasterView } from '@/features/base/part-group/BasePartGroupMasterView';

export default function BasePartGroupPage() {
  return (
    <BaseMasterSubPageLayout
      title="零件族群主檔"
      description="族群名稱、汽車廠牌（nx00_car_brand）與料號匹配 seg1～seg5；對應表 nx00_part_group（目前為前端 mock，未接 API）。"
    >
      <BasePartGroupMasterView />
    </BaseMasterSubPageLayout>
  );
}
