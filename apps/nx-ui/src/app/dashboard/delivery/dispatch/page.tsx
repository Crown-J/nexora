// apps/nx-ui/src/app/dashboard/delivery/dispatch/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX06-DISPATCH-UI-001-F01
// 路由：/dashboard/delivery/dispatch
// 性質：UI stub placeholder（TASK-NX06-IMPL-01 Phase 5、UI 獨立軌 backlog）
export default function Nx06DispatchWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX06-DISPATCH-UI-001-F01"
      title="配單工作台"
      desc="倉管組長 DRAFT → DISPATCHED 配單（driver + vehicleNo）、API：PATCH /nx06/dispatch/:dnId/assign、UI 獨立軌 TASK-NX06-IMPL-UI-01"
    />
  );
}
