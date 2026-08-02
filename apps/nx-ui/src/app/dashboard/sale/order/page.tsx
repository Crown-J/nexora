// apps/nx-ui/src/app/dashboard/sale/order/page.tsx
// 建立銷貨單（九宮格 銷售第 2 格 ▸ 1）—— v3.0.0 一頁式，取代舊的「即時銷售」浮層工作站。
//
// ⚠️ 外層要給 min-h-0 + flex-1：FlowTemplate 左欄常駐、右欄自己捲，
//    少了這層外殼的 overflow 會跟它打架（整頁一起捲，左邊流程軌就跟著捲走了）。

import { SoOpsView } from '@/features/nx04/so-ops/ui/SoOpsView';

export default function Nx04SoOpsRoute() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SoOpsView />
    </div>
  );
}
