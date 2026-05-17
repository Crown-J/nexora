import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX05-WS-UI-001-F01
// 路由：/dashboard/nx05/workspace
// 性質：UI stub placeholder（Crown Q-U1=c 對齊 NX02/NX04 範式、本軌純 backend、UI 獨立軌 backlog）
// 對應軌：TASK-NX05-IMPL-01 Phase 5（UI stub）+ TASK-NX05-IMPL-UI-01（UI 獨立軌）
export default function Nx05WorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX05-WS-UI-001-F01"
      title="財務工作台"
      desc="AR / AP / 收付款 / 折讓 / 票據 / 關帳 / 對帳單 / 逾期催收（A 軌 backend 已 closure、9 業務功能完整 + 7 跨模組 helper、UI 獨立軌 TASK-NX05-IMPL-UI-01）"
    />
  );
}
