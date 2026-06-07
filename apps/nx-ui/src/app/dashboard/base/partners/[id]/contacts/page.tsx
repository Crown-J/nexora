// apps/nx-ui/src/app/dashboard/base/partners/[id]/contacts/page.tsx
// 02 第三批 T2 2026-06-07：partner 聯絡窗口管理 sub-page
'use client';

import { use } from 'react';
import Link from 'next/link';

import { PartnerContactManager } from '@/features/shared/partner-contact/PartnerContactManager';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/base/partners" className="text-xs text-[#888892] hover:text-[#E8E8EC]">
          ← 回往來對象主檔
        </Link>
      </div>
      <h1 className="text-base font-semibold text-[#E8E8EC]">聯絡窗口管理</h1>
      <p className="text-xs text-[#5A5A60]">客戶代碼 {id}</p>
      <PartnerContactManager partnerId={id} />
    </div>
  );
}
