// apps/nx-ui/src/app/dashboard/base/role-view/page.tsx
/** 職務權限設定 — 矩陣版（職務 × 畫面 × 5 權限）；DashboardShell 已加 bypass。 */
'use client';

import { RoleViewMatrixPage } from '@/features/base/role-view/RoleViewMatrixPage';

export default function Page() {
  return <RoleViewMatrixPage />;
}
