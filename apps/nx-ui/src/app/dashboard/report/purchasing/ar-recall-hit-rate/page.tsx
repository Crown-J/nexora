// apps/nx-ui/src/app/dashboard/report/purchasing/ar-recall-hit-rate/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-PURCHASING-ARHIT-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-PURCHASING-ARHIT-UI-001-F01"
      title="AR 補貨建議命中率 ⭐⭐⭐"
      desc="業界改革 #1（接合 AR-IMPL-01）：90 天 Nx02Demand[demandType=S].refRfqId IS NOT NULL / total %。API：GET /nx08/dashboard/purchasing/ar-recall-hit-rate"
    />
  );
}
