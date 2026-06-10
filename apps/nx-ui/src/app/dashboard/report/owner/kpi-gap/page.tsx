// apps/nx-ui/src/app/dashboard/report/owner/kpi-gap/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-OWNER-KPIGAP-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-OWNER-KPIGAP-UI-001-F01"
      title="KPI 目標 vs 實績"
      desc="user-level KpiTarget 本年度列表（含 kpiTemplate.name + unit）。API：GET /nx08/dashboard/owner/kpi-gap"
    />
  );
}
