// apps/nx-ui/src/app/dashboard/master/partners/other/page.tsx
// 其他往來對象：往來對象主檔 filtered view（T 外包物流 / V 一般廠商 / B 銀行）
'use client';

import { PartnerMasterPage } from '@/features/nx01/partner/partner-zoned';

export default function Page() {
  return (
    <PartnerMasterPage
      pageCategory="交易對象"
      pageTitle="其他往來對象"
      entityNoun="往來對象"
      filterPartnerTypes={['T', 'V', 'B']}
      createDefaultPartnerType="V"
    />
  );
}
