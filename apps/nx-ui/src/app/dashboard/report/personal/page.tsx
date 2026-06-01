// apps/nx-ui/src/app/dashboard/report/personal/page.tsx
// v1.2 階段 H P3a：個人月報入口
'use client';

import { PersonalMonthlyReportView } from '@/features/nx08/ui/PersonalMonthlyReport';

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <PersonalMonthlyReportView />
    </div>
  );
}
