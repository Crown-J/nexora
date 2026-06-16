// apps/nx-ui/src/app/dashboard/master/partners/[id]/addresses/page.tsx
// 02 對齊第二批前端收尾軌 FE-CP2 2026-06-07：partner 地址管理 sub-page
'use client';

import { use } from 'react';
import Link from 'next/link';

import { PartnerAddressManager } from '@/features/shared/address/PartnerAddressManager';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/master/partners" className="text-xs text-[#888892] hover:text-[#E8E8EC]">
          ← 回往來對象主檔
        </Link>
      </div>
      <h1 className="text-base font-semibold text-[#E8E8EC]">地址管理</h1>
      <p className="text-xs text-[#5A5A60]">客戶代碼 {id}</p>
      <PartnerAddressManager partnerId={id} />
    </div>
  );
}
