// apps/nx-ui/src/features/nx03/workstation/stocktake/StocktakeRoute.tsx
//
// 盤點的三套佈局分流（現場殼第 5 步・下半）
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §7
//
// ⭐ 跟撿貨／包貨／出貨同一個做法：
//    手機／註冊過的螢幕 → 現場數數（CountField）
//    其餘電腦          → 看板＝既有的盤點單清單（管理盤點單本身），⛔ 不重寫
//
// ⚠️ 這裡的分流要放在 features 層⛔ 不能放 app/page.tsx：
//    盤點單清單是 'use client' + hook 組成的，得在 client 元件裡才判斷得了佈局。

'use client';

import { useStockTakeList } from '@/features/nx03/stock-take/hooks/useStockTakeList';
import { StockTakeListView } from '@/features/nx03/stock-take/ui/StockTakeListView';
import { useWorkstation } from '@design/hooks/useWorkstation';
import { LegacyBoardFrame } from '@design/templates/LegacyBoardFrame';

import { CountField } from './CountField';

function StockTakeBoard() {
  const vm = useStockTakeList();
  return <StockTakeListView vm={vm} />;
}

export function StocktakeRoute() {
  const ws = useWorkstation();
  if (ws.ready && ws.layout === 'board') {
    return (
      // ⚠️ 舊清單繞過現場殼，逃生出口要另外包回去
      <LegacyBoardFrame>
        <StockTakeBoard />
      </LegacyBoardFrame>
    );
  }
  return <CountField />;
}
