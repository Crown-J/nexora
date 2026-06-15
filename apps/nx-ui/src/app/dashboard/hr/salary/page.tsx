// apps/nx-ui/src/app/dashboard/hr/salary/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX07-SALARY-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX07-SALARY-UI-001-F01"
      title="薪資管理 + KPI 業績獎金 ⭐⭐⭐"
      desc="payroll CRUD + 雙層脫敏（自己 vs 別人）+ KPI bonus apply（業界改革 #2、NX04→NX07 wire）+ CONFIRMED 自動建 NX05 Paylog（業務閉環完整化 ⭐⭐⭐）。API：/nx07/payroll + POST /nx07/salary-accrual/apply-kpi-bonus"
    />
  );
}
