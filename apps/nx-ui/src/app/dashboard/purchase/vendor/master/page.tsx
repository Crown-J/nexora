// apps/nx-ui/src/app/dashboard/purchase/vendor/master/page.tsx
// v1.2 階段 E P2：採購 → 供應商管理（partner basic + finance 分區）
// 對齊決策 3.1 + v1.1 §1：列表只顯示 S、編輯只動 basic + finance 區
// （舊 /purchase/vendor DEMO 視圖獨立保留、本路徑為真連動主檔範式入口）
'use client';

import { PartnerMasterPage } from '@/features/partner-zoned';

const EDITABLE_ZONES = new Set(['basic', 'finance'] as const);

export default function PurchaseVendorMasterPage() {
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
