// apps/nx-ui/src/app/dashboard/nx07/attendance/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX07-ATTENDANCE-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX07-ATTENDANCE-UI-001-F01"
      title="出勤打卡"
      desc="checkin / checkout 快速打卡 + CRUD。API：/nx07/attendance（7 endpoint）。IpWhitelist + GPS 校驗留後續軌 TASK-NX07-IMPL-04-IP-WHITELIST"
    />
  );
}
