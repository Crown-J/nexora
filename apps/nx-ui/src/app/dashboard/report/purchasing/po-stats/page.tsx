// apps/nx-ui/src/app/dashboard/report/purchasing/po-stats/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-PURCHASING-POSTATS-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-PURCHASING-POSTATS-UI-001-F01"
      title="採購額月度統計"
      desc="當月 PO count + amount 累計。API：GET /nx08/dashboard/purchasing/po-stats"
    />
  );
}
