// apps/nx-ui/src/app/dashboard/inventory/disposal/[id]/page.tsx
// F2 報廢 UI 2026-06-08：報廢單詳細頁

'use client';

import { useParams } from 'next/navigation';

import { DisposalDetailView } from '@/features/inventory/disposal/ui/DisposalDetailView';

export default function InventoryDisposalDetailRoute() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  return id ? <DisposalDetailView id={id} /> : <p className="text-sm text-muted-foreground">無效單據</p>;
}
