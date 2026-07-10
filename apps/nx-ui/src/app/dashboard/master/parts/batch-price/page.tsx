// apps/nx-ui/src/app/dashboard/master/parts/batch-price/page.tsx
// 偉盟 P2 2.8 Step 3 2026-07-11：批次調價工具頁（維運工具、鎖管理角色由後端 guard）
'use client';

import Link from 'next/link';

import { BatchPriceTool } from '@/features/nx01/product/batch-price/BatchPriceTool';

export default function Page() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/master/parts" className="text-xs text-[#888892] hover:text-[#E8E8EC]">
          ← 回零件主檔
        </Link>
      </div>
      <h1 className="text-base font-semibold text-[#E8E8EC]">批次調價</h1>
      <p className="text-xs text-[#5A5A60]">
        漲價潮維運工具：選範圍 → 設調幅 → 預覽 → 確認套用。只調「原價 &gt; 0」的欄位、套用寫入稽核日誌與價格更新戳記。
      </p>
      <BatchPriceTool />
    </div>
  );
}
