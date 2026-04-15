'use client';

import { ModulePageNav } from '@/features/layout/ui/ModulePageNav';
import { FINANCE_NAV_ITEMS } from '@/app/dashboard/finance/_nav';
import { ModulePlaceholderPage } from '@/features/layout/ui/ModulePlaceholderPage';

export default function FinanceClosingPage() {
  return (
    <div className="space-y-4">
      <ModulePageNav items={FINANCE_NAV_ITEMS} backHref="/dashboard/finance" backLabel="財務首頁" />
      <ModulePlaceholderPage title="關帳" description="NX05 月結與關帳檢核（開發中）。" />
    </div>
  );
}
