// apps/nx-ui/src/app/dashboard/inventory/issue-report/[id]/page.tsx
// NX03-STOCK-LITE M3-3a：異常回報詳情

import { IssueReportDetailView } from '@/features/inventory/issue-report/ui/IssueReportDetailView';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function InventoryIssueReportDetailRoute({ params }: RouteParams) {
  const { id } = await params;
  return <IssueReportDetailView id={id} />;
}
