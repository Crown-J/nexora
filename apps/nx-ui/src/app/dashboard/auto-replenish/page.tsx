import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE AR-DASH-UI-001-F01
// 路由：/dashboard/auto-replenish
// 性質：UI stub placeholder（Crown Q-U1=A、本軌純 backend、UI 獨立軌 backlog）
// 對應軌：TASK-AR-IMPL-01 Phase 6（UI stub）
export default function AutoReplenishDashboardPage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="AR-DASH-UI-001-F01"
      title="自動補貨建議單"
      desc="系統依進貨/銷貨數據算建議量、產品/倉管最終決定（B 軌 backend 已 closure、UI 獨立軌 backlog）"
    />
  );
}
