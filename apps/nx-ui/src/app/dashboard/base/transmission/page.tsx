// apps/nx-ui/src/app/dashboard/base/transmission/page.tsx
'use client';

import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';
import { TransmissionMasterView } from '@/features/nx01/vehicle-classification/ui/TransmissionMasterView';

export default function TransmissionPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="變速箱型錄" />
      <TransmissionMasterView />
    </div>
  );
}
