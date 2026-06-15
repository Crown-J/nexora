// apps/nx-ui/src/app/dashboard/delivery/handover/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX06-HANDOVER-UI-001-F01
// 路由：/dashboard/delivery/handover
// 性質：UI stub placeholder（TASK-NX06-IMPL-02 Phase 6、UI 獨立軌 backlog、⭐⭐⭐ 業界改革候選）
export default function Nx06HandoverWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX06-HANDOVER-UI-001-F01"
      title="動態任務轉派（亞羅核心競爭力 ⭐⭐⭐）"
      desc="半徑 + 任務量平衡 + ETA 演算法、半自動倉管組長拍板、中小汽配 ERP 業界第一個、API：POST /nx06/handover/suggest + /create + PATCH /:id/status、UI 獨立軌 TASK-NX06-IMPL-UI-01"
    />
  );
}
