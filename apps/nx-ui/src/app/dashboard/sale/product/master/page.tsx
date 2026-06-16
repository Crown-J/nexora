// apps/nx-ui/src/app/dashboard/sale/product/master/page.tsx
// v1.2 階段 E P3：銷貨 → 產品（售價維護角度、part basic + sales 分區）
// 對齊 v1.1 §3.2 屏障 1：「售價只放銷售頁、業務不必拿主檔中心 key 也能維護售價」
// Alex 2026-05-30 拍板補 sale.product.* 6 個權限、本頁為對應入口
'use client';

import { PartZonedPage } from '@/features/nx01/product/part-zoned';

const EDITABLE_ZONES = new Set(['basic', 'sales'] as const);

export default function SaleProductMasterPage() {
  return (
    <PartZonedPage
      pageCategory="銷貨"
      pageTitle="產品售價維護"
      entityNoun="產品"
      editableZones={EDITABLE_ZONES}
    />
  );
}
