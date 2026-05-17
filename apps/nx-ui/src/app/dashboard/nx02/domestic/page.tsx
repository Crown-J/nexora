import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX02-PO-UI-001-F01
// 路由：/dashboard/nx02/domestic
// 性質：UI stub placeholder（Crown Q-U1=c、本軌純 backend、UI 獨立軌 backlog）
// 對應軌：TASK-NX02-IMPL-01 Phase 6（UI stub）+ TASK-NX02-IMPL-UI-01（UI 獨立軌）
export default function Nx02DomesticWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX02-PO-UI-001-F01"
      title="國內採購作業工作台"
      desc="詢價 → 採購單 → 驗收 → 入帳（A 軌 backend 已 closure、API：POST /nx02/po purchaseType=D、UI 獨立軌 TASK-NX02-IMPL-UI-01）"
    />
  );
}
