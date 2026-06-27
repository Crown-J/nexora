// apps/nx-ui/src/app/dashboard/page.tsx
// NX00 首頁 /dashboard
// 2026-06-27 大改版：太空風 HomeShell 封存、改傳統 ERP 首頁工作區（外殼由 layout 的 WorkbenchShell 提供）

import { WorkbenchHome } from '@design/layout/workbench/WorkbenchHome';

export default function DashboardRootPage() {
  return <WorkbenchHome />;
}
