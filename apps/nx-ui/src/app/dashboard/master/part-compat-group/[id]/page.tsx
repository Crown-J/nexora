// apps/nx-ui/src/app/dashboard/master/part-compat-group/[id]/page.tsx
// 02 對齊第二批前端收尾軌 FE-CP5 2026-06-07：通用件群組成員管理 sub-page
'use client';

import { use } from 'react';
import Link from 'next/link';

import { GroupMemberManager } from '@/features/shared/part-compat/GroupMemberManager';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/master/part-compat-group" className="text-xs text-[#888892] hover:text-[#E8E8EC]">
          ← 回通用件群組
        </Link>
      </div>
      <h1 className="text-base font-semibold text-[#E8E8EC]">群組成員管理</h1>
      <p className="text-xs text-[#5A5A60]">群組 ID {id}</p>
      <GroupMemberManager groupId={id} />
    </div>
  );
}
