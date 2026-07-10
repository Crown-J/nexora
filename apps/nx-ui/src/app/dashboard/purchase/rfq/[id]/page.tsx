// apps/nx-ui/src/app/dashboard/purchase/rfq/[id]/page.tsx
// NX02-RFQ-SHELL：詢價單詳情 → 單據外殼 RfqWorkbench（同頁詳細分頁）
'use client';

import { useParams } from 'next/navigation';

import { RfqWorkbench } from '@/features/nx02/rfq/ui/RfqWorkbench';

export default function RfqDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  if (!id) {
    return <p className="text-sm text-muted-foreground">無效單據</p>;
  }
  return <RfqWorkbench initialId={id} />;
}
