// apps/nx-ui/src/app/dashboard/nx09/workspace/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX09-WS-UI-001-F01
// 路由：/dashboard/nx09/workspace
// 性質：UI stub placeholder（TASK-NX09-IMPL-01 Phase 6、UI 獨立軌 backlog）
export default function Nx09WorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX09-WS-UI-001-F01"
      title="EIP 企業資訊平台首頁"
      desc="6 子模組（KM 知識庫 / Document 制度文件 / SystemManual ⭐ / 全文搜尋 ⭐ / Meeting / 子表）+ 26 endpoint。Postgres FTS（純原生、不裝 Elasticsearch、業界中小 ERP 罕見）。IMPL-02 後續軌 = 亞羅特色 VIN/維修 SOP + 跨模組接點。UI 獨立軌 TASK-NX09-IMPL-UI-01"
    />
  );
}
