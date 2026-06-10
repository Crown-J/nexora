// apps/nx-ui/src/app/dashboard/report/strategy/strategy-kpi/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-STRATEGY-KPI-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-STRATEGY-KPI-UI-001-F01"
      title="戰略 KPI（業界改革 3 指標複合）"
      desc="AR hit rate + Handover completion rate + BCG health score（複合戰略指標）。API：GET /nx08/dashboard/strategy/strategy-kpi"
    />
  );
}
