// apps/nx-ui/src/app/dashboard/nx07/workspace/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX07-WS-UI-001-F01
// 路由：/dashboard/nx07/workspace
// 性質：UI stub placeholder（TASK-NX07-IMPL-01 Phase 5、UI 獨立軌 backlog）
export default function Nx07WorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX07-WS-UI-001-F01"
      title="人資管理首頁（HR_ADMIN）"
      desc="8 子模組（attendance / leave / overtime / payroll / performance / training / employee-change / medical ⭐）+ 47 endpoint。2 跨模組 wire：NX04→NX07 業績獎金 ⭐⭐⭐ + NX07→NX05 Paylog 發薪 ⭐⭐⭐（業務閉環完整化第三大現金流）。UI 獨立軌 TASK-NX07-IMPL-UI-01"
    />
  );
}
