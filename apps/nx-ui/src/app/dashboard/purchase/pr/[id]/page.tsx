// apps/nx-ui/src/app/dashboard/purchase/pr/[id]/page.tsx
// NX02-PR-SHELL：進貨退回詳情 → 單據外殼 PrWorkbench（同頁詳細分頁）
'use client';

import { useParams } from 'next/navigation';

import { PrWorkbench } from '@/features/nx02/pr/ui/PrWorkbench';

export default function PrDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  if (!id) {
    return <p className="text-sm text-muted-foreground">無效單據</p>;
  }
  return <PrWorkbench initialId={id} />;
}
