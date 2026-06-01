// apps/nx-ui/src/app/dashboard/report/sales/page.tsx
// v1.2 階段 H P3c：銷售報表入口
'use client';

import { SalesReport } from '@/features/nx08/ui/SalesReport';

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <SalesReport />
    </div>
  );
}
