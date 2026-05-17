// apps/nx-ui/src/app/dashboard/nx10/workspace/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX10-WS-UI-001-F01
// 路由：/dashboard/nx10/workspace
// 性質：UI stub placeholder（TASK-NX10-IMPL-01 Phase 5、UI 獨立軌 backlog）
export default function Nx10WorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX10-WS-UI-001-F01"
      title="八角遊戲化系統首頁（IMPL-01 + IMPL-02 完整化）"
      desc="Yu-kai Chou 八角框架（Octalysis Framework）8 角完整落地。IMPL-01 #2 #4 #6 #7 #8（成就/佔有/稀缺/好奇/損失）+ IMPL-02 #1 #3 #5（使命/賦權/社交）。10 子模組（勳章 20 levels / 排行 / 任務 / 驚喜寶箱 ⭐#7 / 衝刺 ⭐#6 / 團隊任務 ⭐#5 / 帶新人 ⭐#5+#1 / 轉職 3 階審核 ⭐⭐⭐ / 動態交接獎勵 ⭐⭐⭐）+ 34 endpoint + 3 跨模組 helper wire（NX06 handover / NX04 SO 業績 / NX07 醫章加碼）"
    />
  );
}
