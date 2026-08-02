// apps/nx-ui/src/app/dashboard/inventory/stock-take/page.tsx
// 盤點作業（九宮格 倉庫第 4 格 ▸ 1）—— v3.0.0 現場殼。
//
// ⭐ 一支殼・一個路由・三套佈局（外殼規格 §7）：
//    手機／註冊過的螢幕 → 現場數數（一項一項填實際數量、掃碼跳項）
//    其餘電腦          → 看板＝既有的盤點單清單（⛔ 不重寫）
//
// ⛔ 不另開手機路由（已作廢決策清單 §18）。
// ⚠️ 系統裡另有一套 /dashboard/inventory/stocktake（孤兒、手機掃碼在那）——
//    兩套盤點尚未收斂，見已作廢決策清單 §13。

import { StocktakeRoute } from '@/features/nx03/workstation/stocktake/StocktakeRoute';

export default function Nx02StockTakeListPage() {
  return <StocktakeRoute />;
}
