// apps/nx-ui/src/app/dashboard/delivery/driver/handover/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX06-DRIVER-HANDOVER-UI-001-F01
export default function Nx06DriverHandoverPage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX06-DRIVER-HANDOVER-UI-001-F01"
      title="外務員 PWA 動態交接（接收 / 處理）"
      desc="收到 SUGGESTED handover、接受 / 拒絕 / 完成、API：GET /nx06/handover/driver/:driverId + PATCH /nx06/handover/:id/status"
    />
  );
}
