// apps/nx-ui/src/app/dashboard/report/finance/cash-flow/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-FINANCE-CASHFLOW-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-FINANCE-CASHFLOW-UI-001-F01"
      title="現金流預測"
      desc="未來 30/60/90 天 AR inflow vs AP outflow buckets。API：GET /nx08/dashboard/finance/cash-flow"
    />
  );
}
