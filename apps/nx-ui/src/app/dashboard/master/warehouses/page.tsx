// apps/nx-ui/src/app/dashboard/master/warehouses/page.tsx
// v1.2 階段 E P6 closure：倉庫主檔直接走 zoned 範式（3 zone：basic + inventory + delivery）
// 對齊總經理 STOP-1 拍板⑤：用新版 zoned 替換舊版 EntityMasterPage 6 欄頁
// 既有 /zoned 子路徑已清、避免雙路徑
'use client';

import { WarehouseZonedPage } from '@/features/nx01/location/warehouse-zoned';

export default function Page() {
  return (
    <WarehouseZonedPage
      pageCategory="組織架構"
      pageTitle="倉庫基本資料"
      entityNoun="倉庫"
    />
  );
}
