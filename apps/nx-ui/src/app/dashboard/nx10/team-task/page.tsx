// apps/nx-ui/src/app/dashboard/nx10/team-task/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX10-TEAMTASK-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX10-TEAMTASK-UI-001-F01"
      title="團隊任務 ⭐（八角驅動力 #5 社交影響）"
      desc="跨部門協作任務系統。targetType：AT 出勤率 / KP KPI / DR 配送率 / OT 加班率；taskCycle：W 週 / M 月。團隊達標 → 全員 Exp。API：GET /nx10/team-task + /me / HR_ADMIN：POST + PATCH"
    />
  );
}
