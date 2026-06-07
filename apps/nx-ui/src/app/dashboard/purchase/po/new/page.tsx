// apps/nx-ui/src/app/dashboard/purchase/po/new/page.tsx
// T1-fix-c 進貨對齊批次 2026-06-07：拿掉 PoLiteAware 版本守、採購單三版本一致。
'use client';

import { Suspense } from 'react';

import { PoNewForm } from '@/features/nx01/po/ui/PoNewForm';

export default function Nx01PoNewPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">載入表單…</p>}>
      <PoNewForm />
    </Suspense>
  );
}
