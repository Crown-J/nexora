// apps/nx-ui/src/app/dashboard/delivery/driver/map/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX06-DRIVER-MAP-UI-001-F01
export default function Nx06DriverMapPage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX06-DRIVER-MAP-UI-001-F01"
      title="外務員 PWA 地圖（自己位置 + 任務點）"
      desc="自身 GPS heartbeat 30 秒上傳 + 顯示 active DN 訪問順序、API：PATCH /nx06/delivery/:id/location（heartbeat 既有）"
    />
  );
}
