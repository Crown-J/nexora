// apps/nx-ui/src/app/dashboard/base/customer-grade/page.tsx
'use client';

import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';
import { CustomerGradeMasterView } from '@/features/nx01/customer-grade/ui/CustomerGradeMasterView';

export default function CustomerGradeMasterPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="客戶分級主檔" />
      <CustomerGradeMasterView />
    </div>
  );
}
