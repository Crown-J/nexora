// apps/nx-ui/src/app/dashboard/inventory/receiving/page.tsx
// 進貨驗收（九宮格 倉庫第 1 格 ▸ 1）—— v3.0.0 現場殼。
//
// ⭐ 順手修掉登記過的 bug（已作廢決策清單 §16）：
//    這條路由原本無條件渲染 MobileReceivingListPage、元件裡沒有任何響應式斷點——
//    倉管在電腦上點九宮格進去，看到的是為手機設計的畫面。
//
// ⭐ 三套佈局由裝置與工作站決定（外殼規格 §7）：
//    收貨區螢幕 → 定點 · 手機 → 走動 · 其餘電腦 → 看板
//    ⛔ 這一支沒有舊看板可沿用——舊的那支本來就是手機版，把它當看板才是錯的。

import { ReceiveField } from '@/features/nx03/workstation/receiving/ReceiveField';

export default function InventoryReceivingRoute() {
  return <ReceiveField />;
}
