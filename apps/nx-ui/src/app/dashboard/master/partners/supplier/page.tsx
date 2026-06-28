// apps/nx-ui/src/app/dashboard/master/partners/supplier/page.tsx
// 供應商基本資料：往來對象主檔 filtered view（S 供應商 = 採購對象）
'use client';

import { PartnerMasterPage } from '@/features/nx01/partner/partner-zoned';

export default function Page() {
  return (
    <PartnerMasterPage
      pageCategory="交易對象"
      pageTitle="供應商基本資料"
      entityNoun="供應商"
      filterPartnerTypes={['S']}
      createDefaultPartnerType="S"
    />
  );
}
