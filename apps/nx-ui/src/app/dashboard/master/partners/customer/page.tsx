// apps/nx-ui/src/app/dashboard/master/partners/customer/page.tsx
// 客戶基本資料：往來對象主檔 filtered view（C 保養廠 / O 同行 / L 散客 = 銷售對象）
'use client';

import { PartnerMasterPage } from '@/features/nx01/partner/partner-zoned';

export default function Page() {
  return (
    <PartnerMasterPage
      pageCategory="交易對象"
      pageTitle="客戶基本資料"
      entityNoun="客戶"
      filterPartnerTypes={['C', 'O', 'L']}
      createDefaultPartnerType="C"
    />
  );
}
