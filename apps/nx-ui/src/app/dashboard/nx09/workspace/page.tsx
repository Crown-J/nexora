// apps/nx-ui/src/app/dashboard/nx09/workspace/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX09-WS-UI-001-F01
// 路由：/dashboard/nx09/workspace
// 性質：UI stub placeholder（IMPL-01 + IMPL-02 closure 後升、UI 獨立軌 backlog）
export default function Nx09WorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX09-WS-UI-001-F01"
      title="EIP 企業資訊平台 + 亞羅汽配特色（IMPL-01 + IMPL-02 完整化）"
      desc="8 controller / 61 endpoint：IMPL-01 EIP 基礎（KM / Document / SystemManual ⭐ / Postgres FTS ⭐ / Meeting / 子表 IMPL-01 3）+ IMPL-02 亞羅特色（VIN 對照 ⭐⭐⭐ NHTSA + 手動混合 / 維修 SOP ⭐⭐⭐ 結構化 / RepairSop↔PartModel 內部 wire ⭐⭐⭐ 雙向查詢業界第一 / 4 子表 endpoint 補 17）。後續軌：TASK-NX09-IMPL-03-CROSS-WIRE / TASK-NX09-IMPL-04-RAG / TASK-NX09-IMPL-VIN-API-FALLBACK / TASK-NX09-IMPL-UI-01"
    />
  );
}
