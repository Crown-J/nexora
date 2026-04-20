/**
 * @FUNCTION_CODE NX05-HUB-UI-001-F01
 * 財務中心 Hub（版型對齊 `/dashboard/base`）
 */

'use client';

import {
  Banknote,
  CreditCard,
  FileText,
  Landmark,
  Lock,
  Percent,
  Receipt,
} from 'lucide-react';

import { HubLinkCard, ModuleHubSection } from '@/features/layout/ui/module-hub/hub-primitives';

export default function FinanceHubPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">FINANCE CENTER</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">財務中心</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">依作業分區；點選卡片暫導向占位頁（DEMO 主線另接）。</p>
      </header>

      <div className="space-y-10">
        <ModuleHubSection sectionId="fin-ar-ap" title="帳款管理" count={3}>
          <HubLinkCard title="應收帳款" description="客戶帳款追蹤、月結請款、催收作業" Icon={Receipt} />
          <HubLinkCard title="應付帳款" description="廠商付款追蹤、逾期提醒" Icon={Landmark} />
          <HubLinkCard title="發票管理" description="月結客戶統一開立發票、401 報表對帳" Icon={FileText} />
        </ModuleHubSection>

        <ModuleHubSection sectionId="fin-cash" title="收付款" count={2}>
          <HubLinkCard title="收付款記錄" description="現金、匯款收付登記與每日核對" Icon={Banknote} />
          <HubLinkCard title="票據管理" description="支票、本票到期追蹤與兌現確認" Icon={CreditCard} />
        </ModuleHubSection>

        <ModuleHubSection sectionId="fin-close" title="結帳作業" count={2}>
          <HubLinkCard title="折讓作業" description="進貨折讓與銷貨折讓申請與審核" Icon={Percent} />
          <HubLinkCard title="關帳作業" description="每日關帳與月末關帳，鎖定單據" Icon={Lock} />
        </ModuleHubSection>
      </div>
    </div>
  );
}
