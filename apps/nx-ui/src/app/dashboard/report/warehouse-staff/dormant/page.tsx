// apps/nx-ui/src/app/dashboard/report/warehouse-staff/dormant/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-WHSTAFF-DORMANT-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-WHSTAFF-DORMANT-UI-001-F01"
      title="滯銷品警示"
      desc="90 天無出貨 + 有庫存 → top 20 by onHandQty。API：GET /nx08/dashboard/warehouse-staff/dormant"
    />
  );
}
