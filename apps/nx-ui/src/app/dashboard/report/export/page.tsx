'use client';

import { ModulePageNav } from '@/features/layout/ui/ModulePageNav';
import { REPORT_NAV_ITEMS } from '@/app/dashboard/report/_nav';
import { ModulePlaceholderPage } from '@/features/layout/ui/ModulePlaceholderPage';

export default function ReportExportPage() {
  return (
    <div className="space-y-4">
      <ModulePageNav items={REPORT_NAV_ITEMS} backHref="/dashboard/report" backLabel="報表首頁" />
      <ModulePlaceholderPage title="匯出中心" description="批次 CSV／Excel 匯出（開發中）。" />
    </div>
  );
}
