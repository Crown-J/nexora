// apps/nx-ui/src/app/dashboard/delivery/route/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX06-ROUTE-UI-001-F01
// 路由：/dashboard/delivery/route
// 性質：UI stub placeholder（TASK-NX06-IMPL-02 Phase 6、UI 獨立軌 backlog）
export default function Nx06RouteWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX06-ROUTE-UI-001-F01"
      title="路線優化工作台"
      desc="單車 TSP + 多車 VRP 簡化版（≤ 5 driver / ≤ 100 DN、亞羅 Q1=100/日）、API：POST /nx06/route-optimization/single-vehicle + /multi-vehicle + GET /batch/:id、UI 獨立軌 TASK-NX06-IMPL-UI-01"
    />
  );
}
