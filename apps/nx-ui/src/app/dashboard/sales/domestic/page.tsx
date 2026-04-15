/**
 * 國內銷售作業工作台（路由 v2：`/dashboard/sales/domestic`）
 * 橫向導覽對齊採購中心子頁。
 */

'use client';

import { ModulePageNav } from '@/features/layout/ui/ModulePageNav';
import { SALES_NAV_ITEMS } from '@/app/dashboard/sales/_nav';
import { SalesFlowHub } from '@/features/nx03/sales/SalesFlowHub';

export default function SalesDomesticPage() {
  return (
    <div className="space-y-4">
      <ModulePageNav items={SALES_NAV_ITEMS} backHref="/dashboard/sales" backLabel="銷貨首頁" />
      <SalesFlowHub />
    </div>
  );
}
