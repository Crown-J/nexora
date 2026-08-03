// apps/nx-ui/src/app/dashboard/purchase/po/new/page.tsx
// 建立採購單（九宮格 採購第 2 格）—— v3.0.0 建單殼一頁式。
//
// ⚠️ 外層要給 min-h-0 + flex-1：FlowTemplate 左欄常駐、右欄自己捲，
//    少了這層外殼的 overflow 會跟它打架（整頁一起捲，左邊流程軌就跟著捲走了）。
//
// ⚠️ 帶 ?rfq= 進來的（詢價單按「轉採購」）暫時仍走舊的建單面板：
//    新流程的「從詢價單帶入」還沒接，⛔ 不能為了換版面把既有的轉單路徑弄斷。
//    接完之後這個分岔就拿掉。
'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { PoWorkbench } from '@/features/nx02/po/ui/PoWorkbench';
import { PoOpsView } from '@/features/nx02/po-ops/ui/PoOpsView';

function PoNewInner() {
  const rfq = useSearchParams().get('rfq') ?? undefined;
  if (rfq) return <PoWorkbench initialCreate initialRfqId={rfq} />;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PoOpsView />
    </div>
  );
}

export default function PoNewPage() {
  return (
    <Suspense fallback={<p className="nx-hint">載入表單…</p>}>
      <PoNewInner />
    </Suspense>
  );
}
