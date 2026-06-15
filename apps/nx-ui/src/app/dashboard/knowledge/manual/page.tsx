// apps/nx-ui/src/app/dashboard/knowledge/manual/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX09-MANUAL-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX09-MANUAL-UI-001-F01"
      title="系統操作手冊 ⭐（業界 ERP 標配）"
      desc="Crown Q5=b 拍板：NEXORA 自帶說明書、SAP/Oracle/MS Dynamics 對標。featureKey 命名規範：模組.功能.動作（如 nx04.so.create）。API：/nx09/system-manual（6 endpoint：list / by-feature/:featureKey ⭐ / get :id / POST / PATCH / DELETE，後 3 SYSADMIN）。UI「？」按鈕 wire 留 TASK-NX09-IMPL-UI-MANUAL-WIRE 後續軌"
    />
  );
}
