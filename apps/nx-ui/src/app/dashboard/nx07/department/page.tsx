// apps/nx-ui/src/app/dashboard/nx07/department/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX07-DEPARTMENT-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX07-DEPARTMENT-UI-001-F01"
      title="部門組織（亞羅 6 部門）"
      desc="Nx01Department 主檔 + Nx01Role 角色（含 HR_ADMIN / SALES / WAREHOUSE / PURCHASING / FINANCE / OWNER）。樹狀組織圖留後續軌（parentId 擴充候選）"
    />
  );
}
