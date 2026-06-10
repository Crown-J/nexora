// apps/nx-ui/src/app/dashboard/purchase/po/page.tsx
// T1-fix-c 進貨對齊批次 2026-06-07：拿掉 PoLiteAware 版本守、採購單三版本一致。
'use client';

import { PoListView } from '@/features/nx02/po/ui/PoListView';

export default function Nx01PoListPage() {
  return <PoListView />;
}
