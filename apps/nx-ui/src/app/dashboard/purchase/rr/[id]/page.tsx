// apps/nx-ui/src/app/dashboard/purchase/rr/[id]/page.tsx
// NX02-RR-SHELL：進貨單詳情 → 單據外殼 RrWorkbench（同頁詳細分頁）
'use client';

import { useParams } from 'next/navigation';

import { RrWorkbench } from '@/features/nx02/rr/ui/RrWorkbench';

export default function RrDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  if (!id) {
    return <p className="text-sm text-muted-foreground">無效單據</p>;
  }
  return <RrWorkbench initialId={id} />;
}
