/**
 * File: apps/nx-ui/src/app/dashboard/purchase/domestic/page.tsx
 *
 * Purpose:
 * - 國內採購作業工作台（路由 v2：`/dashboard/purchase/domestic`）
 */

'use client';

import { ModulePageNav } from '@/features/layout/ui/ModulePageNav';
import { PURCHASE_NAV_ITEMS } from '@/app/dashboard/purchase/_nav';
import { ProcurementFlowHub } from '@/features/nx01/procurement/ProcurementFlowHub';

export default function PurchaseDomesticPage() {
  return (
    <div className="space-y-4">
      <ModulePageNav
        items={PURCHASE_NAV_ITEMS}
        backHref="/dashboard/purchase"
        backLabel="採購首頁"
      />
      <ProcurementFlowHub />
    </div>
  );
}
