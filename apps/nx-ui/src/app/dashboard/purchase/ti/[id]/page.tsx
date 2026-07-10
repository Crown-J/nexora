// apps/nx-ui/src/app/dashboard/purchase/ti/[id]/page.tsx
// NX02-TI-SHELL：同行調貨單詳情 → 單據外殼 TiWorkbench（同頁詳細分頁）
'use client';

import { useParams } from 'next/navigation';

import { TiWorkbench } from '@/features/nx02/ti/ui/TiWorkbench';

export default function TiDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  if (!id) {
    return <p className="text-sm text-muted-foreground">無效單據</p>;
  }
  return <TiWorkbench initialId={id} />;
}
