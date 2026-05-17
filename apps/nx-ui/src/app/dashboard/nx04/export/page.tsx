import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX04-EX-UI-001-F01
// 路由：/dashboard/nx04/export（Alex Phase 6 拍板：既有路由保留、用途改銷退處理、後續 UI 軌可調整路由）
// 性質：UI stub placeholder（Crown Q-U1=c、本軌純 backend、UI 獨立軌 backlog）
// 對應軌：TASK-NX04-IMPL-01 Phase 6（UI stub）+ TASK-NX04-IMPL-UI-01（UI 獨立軌）
export default function Nx04ExportWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX04-EX-UI-001-F01"
      title="銷退處理工作台"
      desc="銷退 3 種並存（R 退錢 / D 折讓 / X 換新、NX05 Allowance bridge、業界改革候選 ⭐⭐、A 軌 backend 已 closure、API：POST /nx04/sales-return、UI 獨立軌 TASK-NX04-IMPL-UI-01）"
    />
  );
}
