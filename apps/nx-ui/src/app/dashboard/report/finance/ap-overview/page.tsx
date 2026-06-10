// apps/nx-ui/src/app/dashboard/report/finance/ap-overview/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-FINANCE-AP-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-FINANCE-AP-UI-001-F01"
      title="應付帳款總覽"
      desc="AP byStatus + 即將到期 30d count。API：GET /nx08/dashboard/finance/ap-overview"
    />
  );
}
