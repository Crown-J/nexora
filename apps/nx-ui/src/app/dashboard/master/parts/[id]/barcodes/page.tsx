// apps/nx-ui/src/app/dashboard/master/parts/[id]/barcodes/page.tsx
// 偉盟 P2 2.6 2026-07-11：零件條碼維護 sub-page（範式對齊 photos）
'use client';

import { use } from 'react';
import Link from 'next/link';

import { PartBarcodeManager } from '@/features/shared/part-barcode/PartBarcodeManager';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/master/parts" className="text-xs text-[#888892] hover:text-[#E8E8EC]">
          ← 回零件主檔
        </Link>
      </div>
      <h1 className="text-base font-semibold text-[#E8E8EC]">零件條碼維護</h1>
      <p className="text-xs text-[#5A5A60]">零件 ID {id}（一顆料可掛多條碼、掃碼工作站以此對照回料號；預設條碼供標籤列印）</p>
      <PartBarcodeManager partId={id} />
    </div>
  );
}
