// apps/nx-ui/src/app/dashboard/purchase/rr/new/page.tsx
// NX02-RR-SHELL：新增進貨單 → 單據外殼 RrWorkbench（直開新增；?rfq= 帶詢價單轉進貨）
'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { RrWorkbench } from '@/features/nx02/rr/ui/RrWorkbench';

function RrNewInner() {
  const sp = useSearchParams();
  const rfq = sp.get('rfq') ?? undefined;
  return <RrWorkbench initialCreate initialRfqId={rfq} />;
}

export default function RrNewPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">載入表單…</p>}>
      <RrNewInner />
    </Suspense>
  );
}
