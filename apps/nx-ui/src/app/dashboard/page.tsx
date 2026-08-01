// apps/nx-ui/src/app/dashboard/page.tsx
// NX00 首頁 /dashboard
// 2026-06-27 大改版：太空風 HomeShell 封存、改傳統 ERP 首頁工作區（外殼由 layout 的 WorkbenchShell 提供）
// 2026-08-01 v3.0.0 階段 3：改用 V3Workbench（規格 §3.3 搜尋框＋三塊）。
//   舊的 WorkbenchHome 封存不刪——回退只要把下面兩行換回去。

import { V3Workbench } from '@design/layout/v3/V3Workbench';

export default function DashboardRootPage() {
  return <V3Workbench />;
}
