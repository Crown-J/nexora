// apps/nx-ui/src/app/dashboard/report/page.tsx
// v1.2 階段 H：報表中心 Hub（NX08 LITE 6 張電腦版報表）

'use client';

import {
  BarChart3,
  Building2,
  LayoutDashboard,
  LineChart,
  PieChart,
  ShoppingCart,
  TrendingUp,
  User,
  Warehouse,
} from 'lucide-react';

import { HubLinkCard, ModuleHubSection } from '@/features/layout/ui/module-hub/hub-primitives';

export default function ReportHubPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">REPORT CENTER</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">報表中心</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          LITE 6 張報表（個人月報 / 進貨 / 銷售 / 庫存 / 損益 / 營運）。手機版隨後接。
        </p>
      </header>

      <div className="space-y-10">
        <ModuleHubSection sectionId="rpt-personal" title="員工視角" count={1}>
          <HubLinkCard
            title="個人月報"
            description="業績（銷貨+毛利）、開單數、撿貨件數、跑客戶家數"
            Icon={User}
            href="/dashboard/report/personal"
          />
        </ModuleHubSection>

        <ModuleHubSection sectionId="rpt-sales" title="銷售分析" count={1}>
          <HubLinkCard
            title="銷售報表"
            description="產品 / 客戶 / 員工三角度、排行+流失預警"
            Icon={TrendingUp}
            href="/dashboard/report/sales"
          />
        </ModuleHubSection>

        <ModuleHubSection sectionId="rpt-purchase" title="採購分析" count={1}>
          <HubLinkCard
            title="進貨報表"
            description="PO 狀態統計、供應商 Top 10、比價分析"
            Icon={ShoppingCart}
            href="/dashboard/report/purchase"
          />
        </ModuleHubSection>

        <ModuleHubSection sectionId="rpt-inv" title="庫存分析" count={1}>
          <HubLinkCard
            title="庫存報表"
            description="週轉率、呆滯品、低庫存警報"
            Icon={Warehouse}
            href="/dashboard/report/inventory"
          />
        </ModuleHubSection>

        <ModuleHubSection sectionId="rpt-fin" title="財務分析" count={1}>
          <HubLinkCard
            title="損益表 PnL"
            description="收入 − 成本 = 毛利、− 費用 = 營業淨利（進銷淨額法）"
            Icon={LineChart}
            href="/dashboard/report/pnl"
          />
        </ModuleHubSection>

        <ModuleHubSection sectionId="rpt-exec" title="經營總覽" count={1}>
          <HubLinkCard
            title="營運報表"
            description="部門業績、KPI 達成、BCG 商品定位（需 OWNER 權限）"
            Icon={LayoutDashboard}
            href="/dashboard/report/ops"
          />
        </ModuleHubSection>
      </div>

      {/* 預留未來 PRO 進階分析 */}
      <div className="space-y-10">
        <ModuleHubSection sectionId="rpt-pro" title="進階分析（PRO）" count={3}>
          <HubLinkCard title="HPA 路徑分析" description="客戶採購路徑 + 交叉銷售" Icon={PieChart} pro />
          <HubLinkCard title="供應商四象限" description="交期 × 品質 × 價格 × 配合度" Icon={Building2} pro />
          <HubLinkCard title="商品 BCG 進階" description="多期動態追蹤、定價建議" Icon={BarChart3} pro />
        </ModuleHubSection>
      </div>
    </div>
  );
}
