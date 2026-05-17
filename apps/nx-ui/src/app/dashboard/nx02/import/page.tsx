import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX02-IM-UI-001-F01
// 路由：/dashboard/nx02/import
// 性質：UI stub placeholder（Crown Q-U1=c、本軌純 backend、UI 獨立軌 backlog）
// 對應軌：TASK-NX02-IMPL-01 Phase 6（UI stub）+ TASK-NX02-IMPL-UI-01（UI 獨立軌）
export default function Nx02ImportWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX02-IM-UI-001-F01"
      title="國外採購作業工作台"
      desc="國外採購 6 階段追蹤（備貨→付款→待出貨→上船→到港→驗收、業界改革候選 ⭐⭐、A 軌 backend 已 closure、API：PATCH /nx02/po/:id/stage、UI 獨立軌 TASK-NX02-IMPL-UI-01）"
    />
  );
}
