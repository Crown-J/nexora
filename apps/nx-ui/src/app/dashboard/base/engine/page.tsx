// apps/nx-ui/src/app/dashboard/base/engine/page.tsx
// 對應規格：docs/nx01/spec/intent/nx01-14-engine.md v1.0 §2
'use client';

import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';
import { EngineMasterView } from '@/features/nx01/engine/ui/EngineMasterView';

export default function EngineMasterPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="引擎主檔" />
      <EngineMasterView />
    </div>
  );
}
