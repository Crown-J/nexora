// apps/nx-ui/src/app/dashboard/delivery/cost/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX06-COST-UI-001-F01
// 路由：/dashboard/delivery/cost
// 性質：UI stub placeholder（TASK-NX06-IMPL-01 Phase 5、UI 獨立軌 backlog）
export default function Nx06CostWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX06-COST-UI-001-F01"
      title="配送成本工作台"
      desc="件項 internalCost 記錄（Crown Q8/Q9=a 汽配業界客戶不另收運費、內部記錄）+ 月底 NX05 PaylogEX 費用支出、API：PATCH /nx06/dn-ops/items/:itemId/internal-cost + helper nx06-create-paylog-from-dn-cost、UI 獨立軌 TASK-NX06-IMPL-UI-01"
    />
  );
}
