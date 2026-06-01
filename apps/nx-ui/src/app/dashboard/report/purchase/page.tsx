// apps/nx-ui/src/app/dashboard/report/purchase/page.tsx
// v1.2 階段 H P3b：進貨報表入口
'use client';

import { PurchaseReport } from '@/features/nx08/ui/PurchaseReport';

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <PurchaseReport />
    </div>
  );
}
