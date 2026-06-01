// apps/nx-ui/src/app/dashboard/report/pnl/page.tsx
// v1.2 階段 H P3e：損益表入口
'use client';

import { PnLReport } from '@/features/nx08/ui/PnLReport';

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <PnLReport />
    </div>
  );
}
