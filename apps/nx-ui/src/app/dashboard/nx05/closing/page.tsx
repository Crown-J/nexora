import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX05-CL-UI-001-F01
// 路由：/dashboard/nx05/closing
// 性質：UI stub placeholder（Crown Q-U1=c、本軌純 backend、UI 獨立軌 backlog）
// 對應軌：TASK-NX05-IMPL-01 Phase 5（UI stub）+ TASK-NX05-IMPL-UI-01（UI 獨立軌）
export default function Nx05ClosingWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX05-CL-UI-001-F01"
      title="關帳工作台"
      desc="Closing 每日關帳（4 階：OPEN/CLOSING/CLOSED/REOPENED）+ 401 報表追蹤 + 解除關帳審計（reopenReason 永久保存）、A 軌 backend 已 closure（401 報表政府對接屬獨立技術軌、本軌 0 涵蓋）、API：GET /nx05/period-close、UI 獨立軌 TASK-NX05-IMPL-UI-01）"
    />
  );
}
