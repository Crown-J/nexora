/**
 * File: apps/nx-ui/src/app/dashboard/nx03/workbench/page.tsx
 *
 * Purpose:
 * - NX03 即時報價／銷貨操作工作台（`useSearchParams` 需 Suspense）
 */

import { Suspense } from 'react';
import { SalesWorkflowPage } from '@/features/nx03/workflow/ui/SalesWorkflowPage';

export default function Nx03WorkbenchPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">載入中…</div>}>
      <SalesWorkflowPage />
    </Suspense>
  );
}