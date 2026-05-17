// apps/nx-ui/src/app/dashboard/nx08/warehouse-lead/delivery-cost/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-WHLEAD-DELIVERYCOST-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-WHLEAD-DELIVERYCOST-UI-001-F01"
      title="配送成本分析"
      desc="當月 DN items internalCost 加總 + Lalamove vs 自家 by logistics type。API：GET /nx08/dashboard/warehouse-lead/delivery-cost"
    />
  );
}
