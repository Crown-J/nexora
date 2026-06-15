// apps/nx-ui/src/app/dashboard/report/warehouse-staff/turnover/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-WHSTAFF-TURNOVER-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-WHSTAFF-TURNOVER-UI-001-F01"
      title="庫存周轉率"
      desc="30 天 stock_ledger qty_out 加總 top 10 by part/warehouse。API：GET /nx08/dashboard/warehouse-staff/turnover"
    />
  );
}
