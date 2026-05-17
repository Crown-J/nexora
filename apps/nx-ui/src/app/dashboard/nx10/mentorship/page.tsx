// apps/nx-ui/src/app/dashboard/nx10/mentorship/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX10-MENTORSHIP-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX10-MENTORSHIP-UI-001-F01"
      title="帶新人系統 ⭐（八角驅動力 #5 + #1 社交 + 使命）"
      desc="HR_ADMIN 指派 mentor → mentee 配對、結束時依 menteeKpiRate 達標發 500 Exp 獎勵給 mentor（業界改革 ⭐⭐⭐）。API：GET /nx10/mentorship/me / HR_ADMIN：POST + PATCH + issueReward"
    />
  );
}
