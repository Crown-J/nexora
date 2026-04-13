/**
 * File: apps/nx-ui/src/app/dashboard/base/currency/page.tsx
 * Purpose: 幣別主檔（路由 v2：`/dashboard/base/currency`）
 */
'use client';
import { BaseCurrencyMasterView } from '@/features/base/currency/BaseCurrencyMasterView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';
export default function BaseCurrencyDashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="幣別主檔" />
      <BaseCurrencyMasterView />
    </div>
  );
}
