// apps/nx-ui/src/app/dashboard/sale/quote/page.tsx
// 報價作業（九宮格 銷售第 1 格）—— v3.0.0 一頁式，取代舊的「即時報價」浮層工作站。
// 執行長 2026-08-01：「客戶打進來就是來詢價，所以要做的就是直接報價。」

import { QuoteOpsView } from '@/features/nx04/quote-ops/ui/QuoteOpsView';

export default function Nx04QuoteOpsRoute() {
  return <QuoteOpsView />;
}
