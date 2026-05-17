// apps/nx-ui/src/app/dashboard/nx10/promotion/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX10-PROMOTION-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX10-PROMOTION-UI-001-F01"
      title="轉職 3 階審核 ⭐⭐⭐（八角驅動力 #3 + #2 + #1 賦權 + 達標 + 使命、業界改革）"
      desc="3 階流程：階段 1 系統驗證（員工申請、查醫章/帶新人/在職月數/KPI/無懲）／ 階段 2 OWNER 推薦 ／ 階段 3 HR_ADMIN 審核（A 核准 / R 退件 / X 取消）→ executeRequest 寫 NX01 user.roleId（業界改革 ⭐⭐⭐）。API：GET /nx10/promotion/criteria + /me / employee：POST apply / OWNER：PATCH recommend / HR_ADMIN：POST criteria + PATCH review + POST execute"
    />
  );
}
