// apps/nx-ui/src/app/dashboard/delivery/driver/tasks/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX06-DRIVER-TASKS-UI-001-F01
export default function Nx06DriverTasksPage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX06-DRIVER-TASKS-UI-001-F01"
      title="外務員 PWA 任務列表"
      desc="當前 driver 名下 active DN（按 routeBatchId + sequence 排序、含 stops + ETA）、API：GET /nx06/driver-mobile/my-dns"
    />
  );
}
