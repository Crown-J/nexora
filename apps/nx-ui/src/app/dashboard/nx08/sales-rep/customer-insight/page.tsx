// apps/nx-ui/src/app/dashboard/nx08/sales-rep/customer-insight/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-SALESREP-CUSTOMER-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-SALESREP-CUSTOMER-UI-001-F01"
      title="客戶分析（VIP / 流失候選）"
      desc="top 10 客戶 by 90d 累計 SO + 流失候選（90d 無下單）。API：GET /nx08/dashboard/sales-rep/customer-insight"
    />
  );
}
