// apps/nx-ui/src/features/home-dashboard/HomeDashboardV2.tsx
// 首頁儀表板 v2 組合
//
// 結構：
//   - 頂列 HomeQuickBar（公告/任務 icon、popover）
//   - 5 個可設定數據格
//   - 三欄（任務 / 行事曆 / 事件簿）
//   - 登入後彈窗（公告、勾「今日不再顯示」）

'use client';

import { HomeBottomColumns } from './HomeBottomColumns';
import { HomeMetricsRow } from './HomeMetricsRow';
import { HomeQuickBar } from './HomeQuickBar';
import { LoginAnnouncementModal } from './LoginAnnouncementModal';

export function HomeDashboardV2() {
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-5">
      <HomeQuickBar />
      <HomeMetricsRow />
      <HomeBottomColumns />
      <LoginAnnouncementModal />
    </div>
  );
}
