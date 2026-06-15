// apps/nx-ui/src/app/dashboard/report/purchasing/supplier-grade/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-PURCHASING-SUPPLIER-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-PURCHASING-SUPPLIER-UI-001-F01"
      title="廠商評等"
      desc="90 天 PO 累計 by supplier top 10。API：GET /nx08/dashboard/purchasing/supplier-grade"
    />
  );
}
