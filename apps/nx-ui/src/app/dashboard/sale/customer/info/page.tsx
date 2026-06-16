// apps/nx-ui/src/app/dashboard/sale/customer/info/page.tsx
// v1.2 階段 E P2：銷貨 → 客戶管理（partner basic + sales 分區）
// 對齊決策 3.1 + v1.1 §1：列表只顯示 C/O、編輯只動 basic + sales 區
'use client';

import { PartnerMasterPage } from '@/features/nx01/partner/partner-zoned';

const EDITABLE_ZONES = new Set(['basic', 'sales'] as const);

export default function SaleCustomerInfoPage() {
  return (
    <PartnerMasterPage
      pageCategory="銷貨"
      pageTitle="客戶資料維護"
      entityNoun="客戶"
      filterPartnerTypes={['C', 'O']}
      editableZones={EDITABLE_ZONES}
      createDefaultPartnerType="C"
    />
  );
}
