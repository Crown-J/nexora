// apps/nx-ui/src/app/dashboard/nx08/sales-rep/personal-sales/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-SALESREP-PERSONAL-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-SALESREP-PERSONAL-UI-001-F01"
      title="個人銷售業績"
      desc="當月 SO 累計 + 目標達成率（KpiTarget user-level）+ KPI gap。API：GET /nx08/dashboard/sales-rep/personal-sales"
    />
  );
}
