// apps/nx-ui/src/app/dashboard/finance/ap/page.tsx
// v1.2 階段 F P4：應付帳款工作台（含 SR 退款彙整視圖）
'use client';

import { ApWorkbench } from '@/features/nx05/ui/ApWorkbench';

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <ApWorkbench />
    </div>
  );
}
