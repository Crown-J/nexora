// apps/nx-ui/src/app/dashboard/knowledge/meeting-detail/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX09-MEETINGDETAIL-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX09-MEETINGDETAIL-UI-001-F01"
      title="會議子表整合（Action + Attendee + Minutes、IMPL-02 子表補）"
      desc="3 子表 14 endpoint：MeetingAction（5 CRUD、status O/I/C/D/X + 自動 completedAt + isOverdue）+ MeetingAttendee（4 CRUD、confirmStatus P/Y/L/N + actualAttended）+ MeetingMinutes（5 CRUD、每會議 unique 一筆、content + decisions）"
    />
  );
}
