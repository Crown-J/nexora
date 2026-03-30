'use client';

import { BaseMasterSubPageLayout } from '@/features/base/shell/BaseMasterSubPageLayout';
import { BasePartMasterView } from '@/features/base/part/BasePartMasterView';

export default function BasePartPage() {
  return (
    <BaseMasterSubPageLayout
      title="零件主檔"
      description="料號、零件／汽車廠牌、正廠（is_oem）、類型（A～D）、規格、單位與啟用；連線 /part、/brand、/lookup/car-brand。"
    >
      <BasePartMasterView />
    </BaseMasterSubPageLayout>
  );
}
