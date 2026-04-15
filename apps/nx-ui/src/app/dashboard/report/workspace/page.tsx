'use client';

import { ModulePageNav } from '@/features/layout/ui/ModulePageNav';
import { REPORT_NAV_ITEMS } from '@/app/dashboard/report/_nav';
import { ModulePlaceholderPage } from '@/features/layout/ui/ModulePlaceholderPage';

export default function ReportWorkspacePage() {
  return (
    <div className="space-y-4">
      <ModulePageNav items={REPORT_NAV_ITEMS} backHref="/dashboard/report" backLabel="報表首頁" />
      <ModulePlaceholderPage
        title="報表工作台"
        description="常用報表捷徑與匯出將集中於此（開發中）。"
      />
    </div>
  );
}
