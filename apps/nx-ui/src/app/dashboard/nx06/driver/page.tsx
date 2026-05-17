// apps/nx-ui/src/app/dashboard/nx06/driver/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX06-DRIVER-HOME-UI-001-F01
// 路由：/dashboard/nx06/driver
// 性質：PWA driver home placeholder（TASK-NX06-IMPL-02 Phase 6、UI 獨立軌 backlog）
export default function Nx06DriverHomePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX06-DRIVER-HOME-UI-001-F01"
      title="外務員 PWA 首頁"
      desc="today active / completed / pending handover / active route batch 聚合、API：GET /nx06/driver-mobile/dashboard、UI 獨立軌 TASK-NX06-IMPL-UI-01"
    />
  );
}
