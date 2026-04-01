'use client';

import { BaseMasterSubPageLayout } from '@/features/base/shell/BaseMasterSubPageLayout';
import { BaseBrandCodeRoleMasterView } from '@/features/base/brand-code-role/BaseBrandCodeRoleMasterView';

export default function BaseBrandCodeRolePage() {
  return (
    <BaseMasterSubPageLayout
      title="零件品牌料號規則"
      description="nx00_brand_code_role；每個零件品牌一筆規則（part_brand_id 唯一）。新增時選品牌；儲存後品牌不可改。"
    >
      <BaseBrandCodeRoleMasterView />
    </BaseMasterSubPageLayout>
  );
}