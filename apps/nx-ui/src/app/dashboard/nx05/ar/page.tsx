import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX05-AR-UI-001-F01
// 路由：/dashboard/nx05/ar
// 性質：UI stub placeholder（Crown Q-U1=c、本軌純 backend、UI 獨立軌 backlog）
// 對應軌：TASK-NX05-IMPL-01 Phase 5（UI stub）+ TASK-NX05-IMPL-UI-01（UI 獨立軌）
export default function Nx05ArWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX05-AR-UI-001-F01"
      title="應收帳款工作台"
      desc="AR 5 階流（含 WRITTEN_OFF）+ overdueDays + 月底對帳單 + 逾期催收警示（業界改革候選 ⭐⭐⭐ 月結客戶必備、A 軌 backend 已 closure、API：GET /nx05/ar-statement/:customerId + GET /nx05/overdue-watcher/list、UI 獨立軌 TASK-NX05-IMPL-UI-01）"
    />
  );
}
