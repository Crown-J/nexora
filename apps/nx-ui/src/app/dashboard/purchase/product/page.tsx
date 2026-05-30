// apps/nx-ui/src/app/dashboard/purchase/product/page.tsx
// v1.2 階段 E P6 closure：直接走 part 分區編輯（basic + purchase + inventory）
// 舊 DEMO mock 視圖已清除（總經理要當第一個真客戶實測、不能出現假資料）
'use client';

import { PartZonedPage } from '@/features/part-zoned';

const EDITABLE_ZONES = new Set(['basic', 'purchase', 'inventory'] as const);

export default function PurchaseProductPage() {
  return (
    <PartZonedPage
      pageCategory="採購"
      pageTitle="採購產品管理"
      entityNoun="產品"
      editableZones={EDITABLE_ZONES}
    />
  );
}
