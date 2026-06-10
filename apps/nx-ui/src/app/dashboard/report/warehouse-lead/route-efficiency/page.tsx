// apps/nx-ui/src/app/dashboard/report/warehouse-lead/route-efficiency/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-WHLEAD-ROUTEEFF-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-WHLEAD-ROUTEEFF-UI-001-F01"
      title="路線效率分析"
      desc="estimated_duration_sec 平均 + 完成率 (DELIVERED/COMPLETED/PICKED_UP)。API：GET /nx08/dashboard/warehouse-lead/route-efficiency"
    />
  );
}
