'use client';

import { ModulePageNav } from '@/features/layout/ui/ModulePageNav';
import { REPORT_NAV_ITEMS } from '@/app/dashboard/report/_nav';
import { ModulePlaceholderPage } from '@/features/layout/ui/ModulePlaceholderPage';

export default function ReportMonthlyPage() {
  return (
    <div className="space-y-4">
      <ModulePageNav items={REPORT_NAV_ITEMS} backHref="/dashboard/report" backLabel="報表首頁" />
      <ModulePlaceholderPage title="月報" description="NX08 月結營運摘要（開發中）。" />
    </div>
  );
}
