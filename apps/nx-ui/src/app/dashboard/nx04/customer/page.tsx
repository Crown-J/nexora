import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX04-CU-UI-001-F01
// 路由：/dashboard/nx04/customer
// 性質：UI stub placeholder（Crown Q-U1=c、本軌純 backend、UI 獨立軌 backlog）
// 對應軌：TASK-NX04-IMPL-01 Phase 6（UI stub）+ TASK-NX04-IMPL-UI-01（UI 獨立軌）
export default function Nx04CustomerWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX04-CU-UI-001-F01"
      title="客戶管理工作台"
      desc="客戶開發 / 分級 / 需求回饋 + 授信擋單（4 機制：黑名單→額度→逾期→付款條件、業界改革候選 ⭐⭐、A 軌 backend 已 closure、API：POST /nx04/credit-guard/check、UI 獨立軌 TASK-NX04-IMPL-UI-01）"
    />
  );
}
