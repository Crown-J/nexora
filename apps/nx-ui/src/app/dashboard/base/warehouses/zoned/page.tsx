// apps/nx-ui/src/app/dashboard/base/warehouses/zoned/page.tsx
// v1.2 階段 E P4：warehouse 主檔中心（分區編輯 zoned 範式 demo）
// 對齊 v1.1 §2.2 + §4.6：主檔中心顯示完整全部區（basic + inventory + delivery）
// 既有 /dashboard/base/warehouses（EntityMasterPage）保留、closure STOP-1 由總經理裁定範式統一
'use client';

import { WarehouseZonedPage } from '@/features/warehouse-zoned';

export default function Page() {
  return (
    <WarehouseZonedPage
      pageCategory="組織架構"
      pageTitle="倉庫基本資料（分區版）"
      entityNoun="倉庫"
      // 主檔中心：無 editableZones、全 3 zone 可編
    />
  );
}
