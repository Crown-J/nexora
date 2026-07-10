// apps/nx-ui/src/app/dashboard/purchase/pr/new/page.tsx
// NX02-PR-SHELL：新增進貨退回 → 單據外殼 PrWorkbench（直開新增；?rr= 預載來源進貨單）
'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { PrWorkbench } from '@/features/nx02/pr/ui/PrWorkbench';

function PrNewInner() {
  const sp = useSearchParams();
  const rr = sp.get('rr') ?? undefined;
  return <PrWorkbench initialCreate initialRrId={rr} />;
}

export default function PrNewPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">載入表單…</p>}>
      <PrNewInner />
    </Suspense>
  );
}
