// apps/nx-ui/src/app/dashboard/nx06/workspace/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX06-WS-UI-001-F01
// 路由：/dashboard/nx06/workspace
// 性質：UI stub placeholder（TASK-NX06-IMPL-01 Phase 5、UI 獨立軌 backlog）
// 對應軌：TASK-NX06-IMPL-01 Phase 5（UI stub）+ TASK-NX06-IMPL-UI-01（UI 獨立軌）
export default function Nx06WorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX06-WS-UI-001-F01"
      title="物流工作台"
      desc="DN 4 物流類型（DELIVERY / PICKUP / INTL_SHIPPING / RETURN_PICKUP）+ 既有 21 endpoint（NX06-IMPL-01 + dispatch + printer + lalamove + dn-ops）、UI 獨立軌 TASK-NX06-IMPL-UI-01"
    />
  );
}
