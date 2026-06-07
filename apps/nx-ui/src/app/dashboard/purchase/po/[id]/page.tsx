// apps/nx-ui/src/app/dashboard/purchase/po/[id]/page.tsx
// T1-fix-c 進貨對齊批次 2026-06-07：拿掉 PoLiteAware 版本守、採購單三版本一致。
'use client';

import { useParams } from 'next/navigation';

import { PoDetailView } from '@/features/nx01/po/ui/PoDetailView';

export default function Nx01PoDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  return id ? <PoDetailView id={id} /> : <p className="text-sm text-muted-foreground">無效單據</p>;
}
