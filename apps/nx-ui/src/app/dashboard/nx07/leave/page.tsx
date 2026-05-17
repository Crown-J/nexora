// apps/nx-ui/src/app/dashboard/nx07/leave/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX07-LEAVE-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX07-LEAVE-UI-001-F01"
      title="請假管理"
      desc="LeaveRequest CRUD + LeaveBalance 顯示。API：/nx07/leave（5 endpoint）+ overtime（5 endpoint）。LeaveType 主檔 schema-only、CRUD endpoint 留後續軌"
    />
  );
}
