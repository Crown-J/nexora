// apps/nx-ui/src/app/dashboard/inventory/issue-report/[id]/page.tsx
// W5-ISSUE-CHAIN Step 4：異常回報詳情 → 單據外殼 IrWorkbench（同頁詳細分頁）

import { IrWorkbench } from '@/features/nx03/issue-report/ui/IrWorkbench';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function InventoryIssueReportDetailRoute({ params }: RouteParams) {
  const { id } = await params;
  return <IrWorkbench initialId={id} />;
}
