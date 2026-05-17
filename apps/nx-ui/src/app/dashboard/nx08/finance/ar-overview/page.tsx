// apps/nx-ui/src/app/dashboard/nx08/finance/ar-overview/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-FINANCE-AR-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-FINANCE-AR-UI-001-F01"
      title="應收帳款總覽"
      desc="AR byStatus 聚合 + 逾期 count。API：GET /nx08/dashboard/finance/ar-overview"
    />
  );
}
