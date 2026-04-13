/**
 * File: apps/nx-ui/src/app/dashboard/purchase/vendor/page.tsx
 *
 * Purpose:
 * - 廠商管理（路由 v2：`/dashboard/purchase/vendor`）
 */

'use client';

import { ModulePageNav } from '@/features/layout/ui/ModulePageNav';
import { PURCHASE_NAV_ITEMS } from '@/app/dashboard/purchase/_nav';

export default function PurchaseVendorPage() {
  return (
    <div className="space-y-4">
      <ModulePageNav
        items={PURCHASE_NAV_ITEMS}
        backHref="/dashboard/purchase"
        backLabel="採購首頁"
      />
      <div className="glass-card rounded-2xl p-6">
        <p className="text-sm text-muted-foreground">廠商管理（開發中）</p>
      </div>
    </div>
  );
}
