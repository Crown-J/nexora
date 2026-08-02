// apps/nx-ui/src/app/dashboard/inventory/ship-zones/page.tsx
// 出貨作業（九宮格 倉庫第 2 格 ▸ 3）—— v3.0.0 現場殼。
//
// ⭐ 一支殼・一個路由・三套佈局（外殼規格 §7）：
//    註冊成工作站的螢幕 → 定點（出貨台：一次交出一箱、自取簽收／寄貨貼單號）
//    手機 → 走動（單人倉）
//    其餘電腦 → 看板（⭐ 沿用既有的出貨三區頁 ShipZonesPage、含配送配單、⛔ 不重寫）
//
// ⭐ 配送配單刻意留在看板：那是「把多張包貨單組成一趟、派給某個外務」，
//    是分配工作⛔ 不是現場執行。
//
// ⛔ 不另開手機路由（已作廢決策清單 §18）。

import { ShipField } from '@/features/nx03/workstation/ship-zones/ShipField';

export default function InventoryShipZonesRoute() {
  return <ShipField />;
}
