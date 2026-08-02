// apps/nx-ui/src/app/dashboard/inventory/packing/page.tsx
// 包貨作業（九宮格 倉庫第 2 格 ▸ 2）—— v3.0.0 現場殼。
//
// ⭐ 一支殼・一個路由・三套佈局（外殼規格 §7）：
//    註冊成工作站的螢幕 → 定點（包貨台的主場：左待包池＋右正在裝的箱＋掃描槍）
//    手機 → 走動（單人倉：撿完直接包）
//    其餘電腦 → 看板（⭐ 沿用既有的包裹工作台 PackageWorkbench、⛔ 不重寫）
//
// ⛔ 不另開手機路由（已作廢決策清單 §18）。

import { PackField } from '@/features/nx03/workstation/packing/PackField';

export default function InventoryPackingRoute() {
  return <PackField />;
}
