// apps/nx-ui/src/app/dashboard/delivery/exception/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX06-EXCEPTION-UI-001-F01
// 路由：/dashboard/delivery/exception
// 性質：UI stub placeholder（TASK-NX06-IMPL-01 Phase 5、UI 獨立軌 backlog）
export default function Nx06ExceptionWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX06-EXCEPTION-UI-001-F01"
      title="物流異常工作台"
      desc="停點異常（status=E + exceptionRemark）+ 件項異常（W=送錯 / Q=數量 / D=破損 / O=其他）、API：PATCH /nx06/dn-ops/stops/:stopId/exception + PATCH /nx06/dn-ops/items/:itemId/exception、UI 獨立軌 TASK-NX06-IMPL-UI-01"
    />
  );
}
