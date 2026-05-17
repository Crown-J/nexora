import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX02-VD-UI-001-F01
// 路由：/dashboard/nx02/vendor
// 性質：UI stub placeholder（Crown Q-U1=c、本軌純 backend、UI 獨立軌 backlog）
// 對應軌：TASK-NX02-IMPL-01 Phase 6（UI stub）+ TASK-NX02-IMPL-UI-01（UI 獨立軌）
export default function Nx02VendorWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX02-VD-UI-001-F01"
      title="供應商管理 + PartnerPart 主檔"
      desc="廠商-料件關係主檔（混合範式：主檔 + 90 天歷史 fallback、業界改革候選 ⭐⭐）+ 供應商評核（範圍 B 戰略軌）、A 軌 backend 已 closure、API：GET /nx02/partner-part、UI 獨立軌 TASK-NX02-IMPL-UI-01）"
    />
  );
}
