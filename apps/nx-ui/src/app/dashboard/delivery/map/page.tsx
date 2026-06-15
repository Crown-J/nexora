// apps/nx-ui/src/app/dashboard/delivery/map/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX06-MAP-UI-001-F01
// 路由：/dashboard/delivery/map
// 性質：UI stub placeholder（TASK-NX06-IMPL-02 Phase 6、UI 獨立軌 backlog）
export default function Nx06MapWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX06-MAP-UI-001-F01"
      title="物流地圖視圖（倉管組長）"
      desc="active DN 即時地圖（dashboard polling 10s、含 driver name + lastLat/Lng + routeBatchId sequence）、API：GET /nx06/dn-ops/map/active、UI 獨立軌 TASK-NX06-IMPL-UI-01"
    />
  );
}
