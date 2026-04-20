/**
 * @FUNCTION_CODE NX08-HUB-UI-001-F01
 * 報表中心 Hub（PRO 占位；版型對齊 `/dashboard/base`）
 */

'use client';

import { BarChart3, Building2, LayoutDashboard, LineChart, PieChart, ShoppingCart, TrendingUp } from 'lucide-react';

import { HubLinkCard, ModuleHubSection } from '@/features/layout/ui/module-hub/hub-primitives';

export default function ReportHubPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">REPORT CENTER</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">報表中心</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          PRO 版分析功能占位；點選卡片將提示升級解鎖（DEMO 主線另接）。
        </p>
      </header>

      <div className="space-y-10">
        <ModuleHubSection sectionId="rpt-sales" title="銷售分析" count={2}>
          <HubLinkCard title="銷售分析" description="業績趨勢、HPA 路徑分析" Icon={TrendingUp} pro />
          <HubLinkCard title="客戶分析" description="客戶等級分布、貢獻度排行" Icon={PieChart} pro />
        </ModuleHubSection>

        <ModuleHubSection sectionId="rpt-purchase" title="採購分析" count={2}>
          <HubLinkCard title="採購分析" description="採購成本趨勢、品類佔比" Icon={ShoppingCart} pro />
          <HubLinkCard title="供應商分析" description="廠商四象限、交期達成率" Icon={Building2} pro />
        </ModuleHubSection>

        <ModuleHubSection sectionId="rpt-inv" title="庫存分析" count={1}>
          <HubLinkCard title="庫存產品分析" description="BCG 矩陣、庫存周轉率、滯銷預警" Icon={BarChart3} pro />
        </ModuleHubSection>

        <ModuleHubSection sectionId="rpt-fin" title="財務分析" count={1}>
          <HubLinkCard title="財務分析" description="現金流瀑布、AP/AR 結構分析" Icon={LineChart} pro />
        </ModuleHubSection>

        <ModuleHubSection sectionId="rpt-exec" title="經營總覽" count={1}>
          <HubLinkCard title="經營分析報表" description="負責人專屬經營儀表板" Icon={LayoutDashboard} pro />
        </ModuleHubSection>
      </div>
    </div>
  );
}
