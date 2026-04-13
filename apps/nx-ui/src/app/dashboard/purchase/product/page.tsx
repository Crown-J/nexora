/**
 * File: apps/nx-ui/src/app/dashboard/purchase/product/page.tsx
 *
 * Purpose:
 * - 採購產品管理（路由 v2：`/dashboard/purchase/product`）
 */

'use client';

import { ModulePageNav } from '@/features/layout/ui/ModulePageNav';
import { PURCHASE_NAV_ITEMS } from '@/app/dashboard/purchase/_nav';

export default function PurchaseProductPage() {
  return (
    <div className="space-y-4">
      <ModulePageNav
        items={PURCHASE_NAV_ITEMS}
        backHref="/dashboard/purchase"
        backLabel="採購首頁"
      />
      <div className="glass-card rounded-2xl p-6">
        <p className="text-sm text-muted-foreground">產品管理（開發中）</p>
      </div>
    </div>
  );
}
