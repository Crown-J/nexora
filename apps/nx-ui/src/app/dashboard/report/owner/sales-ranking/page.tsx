// apps/nx-ui/src/app/dashboard/report/owner/sales-ranking/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-OWNER-RANKING-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-OWNER-RANKING-UI-001-F01"
      title="業務員排行"
      desc="當月 SO（非取消）按 createdBy ranking top 10。API：GET /nx08/dashboard/owner/sales-ranking"
    />
  );
}
