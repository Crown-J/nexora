// apps/nx-ui/src/app/dashboard/purchase/po/[id]/page.tsx
// NX02-PO-SHELL：採購單詳情 → 單據外殼 PoWorkbench（同頁詳細分頁）
'use client';

import { useParams } from 'next/navigation';

import { PoWorkbench } from '@/features/nx02/po/ui/PoWorkbench';

export default function PoDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  if (!id) {
    return <p className="text-sm text-muted-foreground">無效單據</p>;
  }
  return <PoWorkbench initialId={id} />;
}
