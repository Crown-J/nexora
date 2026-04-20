/**
 * @FUNCTION_CODE NX08-DASH-UI-001-F01
 * 報表中心首頁：版型與採購中心一致（Mock 數字）
 */

'use client';

import { CalendarDays, CalendarRange, Download, LayoutDashboard } from 'lucide-react';
import { mockReportCounts } from '@/mocks/report-hub';
import {
  CenterHubCardWrap,
  CenterHubFlowCard,
  CenterHubGroupHeading,
} from '@/features/layout/ui/CenterHubFlowCard';

const ACCENT = '#E8A020';

export function ReportCenterHub() {
  return (
    <div className="w-full min-w-0 space-y-12">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">REPORT CENTER</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">報表中心</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          版型與採購中心一致；日報已有路由，其餘為占位。
        </p>
      </header>

      <section className="space-y-4" aria-labelledby="rep-group-main">
        <CenterHubGroupHeading id="rep-group-main" title="營運報表" />
        <div className="relative z-10 flex min-w-0 flex-col items-stretch gap-6 md:flex-row md:flex-nowrap md:items-center md:justify-start md:overflow-x-auto md:pb-1">
          <CenterHubCardWrap>
            <CenterHubFlowCard
              title="報表工作台"
              description="常用報表與匯出入口"
              icon={LayoutDashboard}
              footerBadge="入口"
              stepLabel="Step.1"
              accentHex={ACCENT}
              subItems={[
                { label: '報表工作台', href: '/dashboard/nx08/workspace' },
                { label: '報表首頁', href: '/dashboard/nx08/workspace' },
              ]}
            />
          </CenterHubCardWrap>
          <CenterHubCardWrap>
            <CenterHubFlowCard
              title="工作日誌（日報）"
              description="NX08 日報／填報"
              icon={CalendarDays}
              footerBadge={`${mockReportCounts.daily.pending}`}
              stepLabel="Step.2"
              accentHex={ACCENT}
              subItems={[
                { label: '填寫日報', href: '/dashboard/nx08/workspace' },
                { label: '報表首頁', href: '/dashboard/nx08/workspace' },
              ]}
            />
          </CenterHubCardWrap>
          <CenterHubCardWrap>
            <CenterHubFlowCard
              title="月報"
              description="月結營運摘要"
              icon={CalendarRange}
              footerBadge={`${mockReportCounts.monthly.total}`}
              stepLabel="Step.3"
              accentHex={ACCENT}
              subItems={[
                { label: '月報（占位）', href: '/dashboard/nx08/workspace' },
                { label: '工作台', href: '/dashboard/nx08/workspace' },
              ]}
            />
          </CenterHubCardWrap>
          <CenterHubCardWrap>
            <CenterHubFlowCard
              title="匯出中心"
              description="CSV／Excel 批次匯出"
              icon={Download}
              footerBadge={`${mockReportCounts.export.total}`}
              accentHex={ACCENT}
              subItems={[
                { label: '匯出（占位）', href: '/dashboard/nx08/workspace' },
                { label: '日報', href: '/dashboard/nx08/workspace' },
              ]}
            />
          </CenterHubCardWrap>
        </div>
      </section>
    </div>
  );
}
