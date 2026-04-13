/**
 * File: apps/nx-ui/src/app/dashboard/base/partners/page.tsx
 *
 * Purpose:
 * - 廠商 / 客戶主檔（路由 v2：`/dashboard/base/partners`）
 */

'use client';

import { BasePartnerMasterView } from '@/features/base/partner/BasePartnerMasterView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';

export default function BasePartnersPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="廠商 / 客戶主檔" />
      <BasePartnerMasterView />
    </div>
  );
}
