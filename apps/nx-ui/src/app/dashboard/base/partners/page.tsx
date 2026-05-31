// apps/nx-ui/src/app/dashboard/base/partners/page.tsx
// 往來對象主檔（v1.2 階段 E P2：分區編輯範式、依 partnerType 動態顯示 zones）
'use client';

import { PartnerMasterPage } from '@/features/partner-zoned';

export default function Page() {
  return (
    <PartnerMasterPage
      pageCategory="交易對象"
      pageTitle="往來對象基本資料"
      entityNoun="往來對象"
      // 主檔中心：無 filterPartnerTypes、無 editableZones（全 zone、依 partnerType 動態）
    />
  );
}
