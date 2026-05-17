// apps/nx-ui/src/app/dashboard/nx08/owner/dept-perf/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

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
