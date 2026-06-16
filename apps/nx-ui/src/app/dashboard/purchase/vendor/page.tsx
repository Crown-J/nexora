// apps/nx-ui/src/app/dashboard/purchase/vendor/page.tsx
// v1.2 階段 E P6 closure：直接走 partner 分區編輯（filter S 供應商、basic + finance）
// 舊 DEMO mock 視圖（1099 行）已清除（總經理要當第一個真客戶實測、不能出現假資料）
'use client';

import { PartnerMasterPage } from '@/features/nx01/partner/partner-zoned';

const EDITABLE_ZONES = new Set(['basic', 'finance'] as const);

export default function PurchaseVendorPage() {
  return (
    <PartnerMasterPage
      pageCategory="採購"
      pageTitle="供應商管理"
      entityNoun="供應商"
      filterPartnerTypes={['S']}
      editableZones={EDITABLE_ZONES}
      createDefaultPartnerType="S"
    />
  );
}
