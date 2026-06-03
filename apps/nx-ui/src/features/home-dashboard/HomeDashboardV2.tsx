// apps/nx-ui/src/features/home-dashboard/HomeDashboardV2.tsx
// 首頁儀表板 v2 組合
//
// 2026-06-03 調整：
//   - 風格全對齊主檔中心（glass-card / border-border/80 / token 化、HubSectionHeader 範式）
//   - 滿版自適應：flex-col h-full、上方 5 數據格 shrink-0、下方三欄 flex-1 撐滿
//   - 公告/任務/精靈全收 MasterTopBar、首頁本體只剩 metric row + bottom columns

'use client';

import { HomeBottomColumns } from './HomeBottomColumns';
import { HomeMetricsRow } from './HomeMetricsRow';

export function HomeDashboardV2() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden p-3 sm:p-4">
      <HomeMetricsRow />
      <HomeBottomColumns />
    </div>
  );
}
