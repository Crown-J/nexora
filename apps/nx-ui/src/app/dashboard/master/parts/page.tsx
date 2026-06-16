// apps/nx-ui/src/app/dashboard/master/parts/page.tsx
// v1.2 階段 E P6 closure：part 主檔走 zoned 範式（全 4 zone）
// 對齊總經理 STOP-1 拍板 A：新版補完 4 客戶自助功能（編碼規則預覽 / 分段 SEG / 正廠子表 inline / 依成本重算）+ 修毛利率技術債後、砍舊版
'use client';

import { PartZonedPage } from '@/features/nx01/product/part-zoned';

export default function Page() {
  return (
    <PartZonedPage
      pageCategory="產品料號"
      pageTitle="零件基本資料"
      entityNoun="零件"
      // 主檔中心：無 editableZones、全 4 zone 可編
    />
  );
}
