// apps/nx-ui/src/app/dashboard/inventory/picking/page.tsx
// 撿貨作業（九宮格 倉庫第 2 格 ▸ 1）—— v3.0.0 現場殼。
//
// ⭐ 一支殼・一個路由・三套佈局（外殼規格 §7）：
//    手機 → 走動（一次一件・掃碼・大按鈕）
//    註冊過的螢幕 → 定點（左佇列＋右當前件・掃描槍）
//    其餘電腦 → 看板（⭐ 沿用既有的三欄看板 PickBoard、⛔ 不重寫）
//
// ⛔ 不另開手機路由——那正是「調貨手機版進不去九宮格」「進貨驗收在電腦上顯示手機畫面」
//    這兩個病的病因（已作廢決策清單 §18）。

import { PickField } from '@/features/nx03/workstation/picking/PickField';

export default function InventoryPickingRoute() {
  return <PickField />;
}
