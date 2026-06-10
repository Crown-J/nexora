// apps/nx-ui/src/app/dashboard/knowledge/meeting/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX09-MEETING-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX09-MEETING-UI-001-F01"
      title="會議系統"
      desc="既有 Meeting 主檔 + 4 子表（Attendee 出席 / Minutes 紀錄 / Action 追蹤事項）。API：/nx09/meeting（5 CRUD）。子表 endpoint 補齊留後續軌 TASK-NX09-IMPL-MEETING-FULL"
    />
  );
}
