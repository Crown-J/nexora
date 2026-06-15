// apps/nx-ui/src/app/dashboard/page.tsx
// NX00 首頁儀表板 /dashboard
// 2026-06-15 棒 #2：改採 HomeShell（UnifiedTopBar + PlanetDock + HomeView）
// 對齊 Hana 成品、退場 SysDashboardPage（舊 MasterTopBar 範式）
// 舊 SysDashboardPage 暫留檔案、引用清零後可刪（待 Phase 2）

import { HomeShell } from '@/features/home/HomeShell';

export default function DashboardRootPage() {
  return <HomeShell />;
}
