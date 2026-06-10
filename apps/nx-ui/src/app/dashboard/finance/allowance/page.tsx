// apps/nx-ui/src/app/dashboard/finance/allowance/page.tsx
// v1.2 階段 F P5-B (2)：折讓核可工作台
'use client';

import { AllowanceWorkbench } from '@/features/nx05/ui/AllowanceWorkbench';

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <AllowanceWorkbench />
    </div>
  );
}
