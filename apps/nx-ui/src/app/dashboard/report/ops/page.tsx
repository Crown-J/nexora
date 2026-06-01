// apps/nx-ui/src/app/dashboard/report/ops/page.tsx
// v1.2 階段 H P3f：營運報表入口（高權限）
'use client';

import { OpsReport } from '@/features/nx08/ui/OpsReport';

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <OpsReport />
    </div>
  );
}
