// apps/nx-ui/src/features/home-dashboard/HomeDashboardV2.tsx
// 首頁儀表板 v2 組合
//
// 2026-06-03 調整：移除首頁獨立 HomeQuickBar / LoginAnnouncementModal、
// 公告/任務/精靈全收進 MasterTopBar；首頁主體乾淨只剩 5 數據格 + 三欄。

'use client';

import { HomeBottomColumns } from './HomeBottomColumns';
import { HomeMetricsRow } from './HomeMetricsRow';

export function HomeDashboardV2() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:gap-4 sm:p-4">
      <HomeMetricsRow />
      <HomeBottomColumns />
    </div>
  );
}
