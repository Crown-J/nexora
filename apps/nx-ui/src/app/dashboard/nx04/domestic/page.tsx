import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX04-SO-UI-001-F01
// 路由：/dashboard/nx04/domestic
// 性質：UI stub placeholder（Crown Q-U1=c、本軌純 backend、UI 獨立軌 backlog）
// 對應軌：TASK-NX04-IMPL-01 Phase 6（UI stub）+ TASK-NX04-IMPL-UI-01（UI 獨立軌）
export default function Nx04DomesticWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX04-SO-UI-001-F01"
      title="銷貨作業工作台"
      desc="查詢 → 報價 → 銷貨 → CONFIRMED 自動調撥 → 撿包出貨（含客戶預設據點 + 配送中部分鎖 + 客訂預估價、業界改革候選 ⭐⭐⭐、A 軌 backend 已 closure、API：POST /nx04/so、UI 獨立軌 TASK-NX04-IMPL-UI-01）"
    />
  );
}
