// apps/nx-ui/src/app/dashboard/finance/closing/page.tsx
// v1.2 階段 F P4：關帳作業（含 401 雙月一期預覽 + 上報旗標）
'use client';

import { ClosingWorkbench } from '@/features/nx05/ui/ClosingWorkbench';

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <ClosingWorkbench />
    </div>
  );
}
