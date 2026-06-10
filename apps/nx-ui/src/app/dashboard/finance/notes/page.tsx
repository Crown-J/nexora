// apps/nx-ui/src/app/dashboard/finance/notes/page.tsx
// v1.2 階段 F P4：票據管理（收付款 4 種方式）
'use client';

import { NotesWorkbench } from '@/features/nx05/ui/NotesWorkbench';

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <NotesWorkbench />
    </div>
  );
}
