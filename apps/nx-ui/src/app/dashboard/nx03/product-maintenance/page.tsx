// apps/nx-ui/src/app/dashboard/nx03/product-maintenance/page.tsx
// v1.2 階段 E P3：庫存 → 產品維護（part basic + inventory 分區）
// 對齊 v1.1 §4.5：庫存頁只顯示安全量 / 最高量 / 預設庫位
// stockSettings 衛星表（per 倉）P5 啟用
'use client';

import { PartZonedPage } from '@/features/part-zoned';

const EDITABLE_ZONES = new Set(['basic', 'inventory'] as const);

export default function Nx03ProductMaintenancePage() {
  return (
    <PartZonedPage
      pageCategory="庫存"
      pageTitle="產品維護（庫存）"
      entityNoun="產品"
      editableZones={EDITABLE_ZONES}
    />
  );
}
