import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX03-WS-UI-001-F01
// 路由：/dashboard/nx03/workspace
export default function Nx03WorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX03-WS-UI-001-F01"
      title="庫存作業工作台"
      desc="入庫 / 出庫 / 盤點"
    />
  );
}
