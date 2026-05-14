// apps/nx-ui/src/app/dashboard/base/model/page.tsx
'use client';

import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';
import { ModelMasterView } from '@/features/nx01/model/ui/ModelMasterView';

export default function ModelMasterPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="車型主檔" />
      <ModelMasterView />
    </div>
  );
}
