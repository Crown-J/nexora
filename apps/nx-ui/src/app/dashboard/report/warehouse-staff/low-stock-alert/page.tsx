// apps/nx-ui/src/app/dashboard/report/warehouse-staff/low-stock-alert/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-WHSTAFF-LOWSTOCK-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-WHSTAFF-LOWSTOCK-UI-001-F01"
      title="缺貨警示"
      desc="onHandQty < part_stock_setting.min_qty 列表。API：GET /nx08/dashboard/warehouse-staff/low-stock-alert"
    />
  );
}
