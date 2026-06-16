// apps/nx-ui/src/app/dashboard/master/role-view/page.tsx
/** 職務權限設定 — 矩陣版（職務 × 畫面 × 5 權限）；DashboardShell 已加 bypass。 */
'use client';

import { RoleViewMatrixPage } from '@/features/nx01/permission/role-view/RoleViewMatrixPage';

export default function Page() {
  return <RoleViewMatrixPage />;
}
