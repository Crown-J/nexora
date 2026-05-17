import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX05-AL-UI-001-F01
// 路由：/dashboard/nx05/allowance
// 性質：UI stub placeholder（Crown Q-U1=c、本軌純 backend、UI 獨立軌 backlog）
// 對應軌：TASK-NX05-IMPL-01 Phase 5（UI stub）+ TASK-NX05-IMPL-UI-01（UI 獨立軌）
export default function Nx05AllowanceWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX05-AL-UI-001-F01"
      title="折讓單工作台"
      desc="Allowance 雙向（P 進貨/S 銷貨）+ 3 處置（O 沖銷/D 下次折抵/R 現金退回）+ 5 階流（DRAFT→PENDING→APPROVED→PROCESSED→VOIDED）+ FinancePeriod 校驗（已補強）、A 軌 backend 已 closure、API：GET /nx05/allowance、UI 獨立軌 TASK-NX05-IMPL-UI-01）"
    />
  );
}
