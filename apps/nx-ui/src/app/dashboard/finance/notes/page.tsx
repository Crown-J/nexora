'use client';

import { ModulePageNav } from '@/features/layout/ui/ModulePageNav';
import { FINANCE_NAV_ITEMS } from '@/app/dashboard/finance/_nav';
import { ModulePlaceholderPage } from '@/features/layout/ui/ModulePlaceholderPage';

export default function FinanceNotesPage() {
  return (
    <div className="space-y-4">
      <ModulePageNav items={FINANCE_NAV_ITEMS} backHref="/dashboard/finance" backLabel="財務首頁" />
      <ModulePlaceholderPage title="票據" description="NX05 票據管理（開發中）。" />
    </div>
  );
}
