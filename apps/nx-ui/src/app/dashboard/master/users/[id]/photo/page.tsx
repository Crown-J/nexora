// apps/nx-ui/src/app/dashboard/master/users/[id]/photo/page.tsx
// 02 第四批 軌 1 2026-06-07：使用者大頭貼管理 sub-page
'use client';

import { use } from 'react';
import Link from 'next/link';

import { UserPhotoManager } from '@/features/shared/user-photo/UserPhotoManager';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/master/users" className="text-xs text-[#888892] hover:text-[#E8E8EC]">
          ← 回使用者主檔
        </Link>
      </div>
      <h1 className="text-base font-semibold text-[#E8E8EC]">大頭貼管理</h1>
      <p className="text-xs text-[#5A5A60]">使用者 ID {id}（單張、拍照或選檔即取代舊大頭貼）</p>
      <UserPhotoManager userId={id} />
    </div>
  );
}
