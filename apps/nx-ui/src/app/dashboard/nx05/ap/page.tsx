import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX05-AP-UI-001-F01
// 路由：/dashboard/nx05/ap
// 性質：UI stub placeholder（Crown Q-U1=c、本軌純 backend、UI 獨立軌 backlog）
// 對應軌：TASK-NX05-IMPL-01 Phase 5（UI stub）+ TASK-NX05-IMPL-UI-01（UI 獨立軌）
export default function Nx05ApWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX05-AP-UI-001-F01"
      title="應付帳款工作台"
      desc="AP 5 階流（OPEN/PARTIAL/PAID/OVERDUE/VOID）+ 3 來源（PO/RR/TI、業界改革候選 ⭐⭐⭐ LITE 直接路徑、A 軌 backend 已 closure、API：GET /nx05/ap、UI 獨立軌 TASK-NX05-IMPL-UI-01）"
    />
  );
}
