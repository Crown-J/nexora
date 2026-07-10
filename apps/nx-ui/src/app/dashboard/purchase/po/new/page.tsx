// apps/nx-ui/src/app/dashboard/purchase/po/new/page.tsx
// NX02-PO-SHELL：新增採購單 → 單據外殼 PoWorkbench（直開新增；?rfq= 帶詢價單轉採購）
'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { PoWorkbench } from '@/features/nx02/po/ui/PoWorkbench';

function PoNewInner() {
  const sp = useSearchParams();
  const rfq = sp.get('rfq') ?? undefined;
  return <PoWorkbench initialCreate initialRfqId={rfq} />;
}

export default function PoNewPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">載入表單…</p>}>
      <PoNewInner />
    </Suspense>
  );
}
