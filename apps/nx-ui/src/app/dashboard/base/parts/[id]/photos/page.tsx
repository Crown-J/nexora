// apps/nx-ui/src/app/dashboard/base/parts/[id]/photos/page.tsx
// 02 第三批 T4 2026-06-07：零件照片管理 sub-page
'use client';

import { use } from 'react';
import Link from 'next/link';

import { PartPhotoManager } from '@/features/shared/part-photo/PartPhotoManager';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/base/parts" className="text-xs text-[#888892] hover:text-[#E8E8EC]">
          ← 回零件主檔
        </Link>
      </div>
      <h1 className="text-base font-semibold text-[#E8E8EC]">零件照片管理</h1>
      <p className="text-xs text-[#5A5A60]">零件 ID {id}（每顆最多 5 張、第一張為主圖）</p>
      <PartPhotoManager partId={id} />
    </div>
  );
}
