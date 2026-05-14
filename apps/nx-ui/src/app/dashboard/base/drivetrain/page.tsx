// apps/nx-ui/src/app/dashboard/base/drivetrain/page.tsx
'use client';

import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';
import { SimpleCatalogMasterView } from '@/features/nx01/vehicle-classification/ui/SimpleCatalogMasterView';

export default function DrivetrainPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="傳動方式型錄" />
      <SimpleCatalogMasterView variant="drivetrains" itemLabel="傳動方式" />
    </div>
  );
}
