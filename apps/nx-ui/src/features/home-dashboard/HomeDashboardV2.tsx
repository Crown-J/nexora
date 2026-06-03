// apps/nx-ui/src/features/home-dashboard/HomeDashboardV2.tsx
// 首頁儀表板 v2 組合：上方 5 數據格 + 下方三欄
//
// 段 A：純殼、5 格全邀請、三欄 placeholder
// 段 B-F：逐段補資料 / 圖表 / 公告 / 任務 / closure
//
// 取代上輪 ModuleTilesBody（Win8 磚體、本輪定案不用、檔留檔 features/home-dashboard/）

'use client';

import { HomeBottomColumns } from './HomeBottomColumns';
import { HomeMetricsRow } from './HomeMetricsRow';

export function HomeDashboardV2() {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
      {/* 上方：5 個可設定數據格 */}
      <HomeMetricsRow />

      {/* 下方：三欄（任務 / 行事曆 / 事件簿）*/}
      <HomeBottomColumns />
    </div>
  );
}
