// apps/nx-ui/src/app/dashboard/hr/employee/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX07-EMPLOYEE-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX07-EMPLOYEE-UI-001-F01"
      title="員工主檔（HR_ADMIN）"
      desc="Nx01User 員工帳號 + 角色 + 部門 + employee-change 異動。API：employee-change CRUD + NX01 User。員工擴充（學歷/證照/緊急聯絡人）留後續軌 TASK-NX07-IMPL-03-EMPLOYEE-PROFILE"
    />
  );
}
