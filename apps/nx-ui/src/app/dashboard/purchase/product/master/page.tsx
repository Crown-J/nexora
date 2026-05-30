// apps/nx-ui/src/app/dashboard/purchase/product/master/page.tsx
// v1.2 階段 E P3：採購 → 產品管理（part basic + purchase + inventory 分區）
// 對齊 v1.1 §4.3：採購頁不放售價 ABCD、屬天然分流（決策 3.2 屏障 1）
// 列管成本 + 安全量（採購業務員建料時順手填）
// 舊 /purchase/product DEMO mock 視圖獨立保留、本路徑為真連動主檔範式入口
'use client';

import { PartZonedPage } from '@/features/part-zoned';

const EDITABLE_ZONES = new Set(['basic', 'purchase', 'inventory'] as const);

export default function PurchaseProductMasterPage() {
  return (
    <PartZonedPage
      pageCategory="採購"
      pageTitle="採購產品管理"
      entityNoun="產品"
      editableZones={EDITABLE_ZONES}
    />
  );
}
