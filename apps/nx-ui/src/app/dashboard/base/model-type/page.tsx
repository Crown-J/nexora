// apps/nx-ui/src/app/dashboard/base/model-type/page.tsx
'use client';

import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';
import { SimpleCatalogMasterView } from '@/features/nx01/vehicle-classification/ui/SimpleCatalogMasterView';

export default function ModelTypePage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="車體類型型錄" />
      <SimpleCatalogMasterView variant="model-types" itemLabel="車體類型" />
    </div>
  );
}
