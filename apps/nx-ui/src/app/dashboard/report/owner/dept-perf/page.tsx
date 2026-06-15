// apps/nx-ui/src/app/dashboard/report/owner/dept-perf/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-OWNER-DEPTPERF-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-OWNER-DEPTPERF-UI-001-F01"
      title="部門業績"
      desc="當月 SO 按 createdBy 聚合 top 20。API：GET /nx08/dashboard/owner/dept-perf"
    />
  );
}
