import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX02-PR-UI-001-F01
// 路由：/dashboard/nx02/product
// 性質：UI stub placeholder（Crown Q-U1=c、本軌純 backend、UI 獨立軌 backlog）
// 對應軌：TASK-NX02-IMPL-01 Phase 6（UI stub）+ TASK-NX02-IMPL-UI-01（UI 獨立軌）
export default function Nx02ProductWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX02-PR-UI-001-F01"
      title="比價分析 + RFQ 詢價工作台"
      desc="3 維度比價（歷史均價 + 新品/特價 + 量大彈性折扣、業界改革候選 ⭐⭐）+ RFQ 文字匯出（廠商 email 範式）、A 軌 backend 已 closure、API：GET /nx02/price-comparison/:partId、UI 獨立軌 TASK-NX02-IMPL-UI-01）"
    />
  );
}
