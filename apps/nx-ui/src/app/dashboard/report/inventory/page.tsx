// apps/nx-ui/src/app/dashboard/report/inventory/page.tsx
// v1.2 階段 H P3d：庫存報表入口
'use client';

import { InventoryReport } from '@/features/nx08/ui/InventoryReport';

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <InventoryReport />
    </div>
  );
}
