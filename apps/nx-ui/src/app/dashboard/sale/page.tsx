// apps/nx-ui/src/app/dashboard/sale/page.tsx
/**
 * @FUNCTION_CODE NX04-HUB-UI-001-F01
 * 銷售中心 Hub（版型對齊 `/dashboard/base`）— R4-C 加 mobile bottom tabs。
 */

'use client';

import { useState } from 'react';
import {
  ArrowLeftRight,
  FileSpreadsheet,
  Handshake,
  MessageCircleQuestion,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Undo2,
  Users,
} from 'lucide-react';

import { HubLinkCard, ModuleHubSection } from '@/features/layout/ui/module-hub/hub-primitives';
import {
  MobileHubSectionTabs,
  type MobileHubSectionTabDef,
} from '@/features/layout/ui/module-hub/MobileHubSectionTabs';

type SaleSectionId = 'master' | 'domestic';

const SALE_TABS: readonly MobileHubSectionTabDef[] = [
  { id: 'master', label: '客戶主檔', Icon: Handshake },
  { id: 'domestic', label: '國內銷售', Icon: ShoppingCart },
];

function MasterSection() {
  return (
    <ModuleHubSection sectionId="sale-master" title="主檔管理" count={1}>
      <HubLinkCard
        title="客戶管理"
        description="客戶主檔、等級設定、需求回饋記錄"
        Icon={Users}
        href="/dashboard/nx04/customer"
      />
    </ModuleHubSection>
  );
}

function DomesticSection() {
  return (
    <ModuleHubSection sectionId="sale-domestic" title="國內銷售" count={7}>
      <HubLinkCard
        title="查詢"
        description="即時查詢庫存、售價、歷史成交記錄"
        Icon={Search}
        stepLabel="STEP 1"
      />
      <HubLinkCard
        title="詢價"
        description="全公司無庫存時向同行詢價"
        Icon={MessageCircleQuestion}
        stepLabel="STEP 1.5"
      />
      <HubLinkCard
        title="報價"
        description="建立報價單傳給客戶確認"
        Icon={FileSpreadsheet}
        stepLabel="STEP 2"
        href="/dashboard/sale/qt"
      />
      <HubLinkCard
        title="調貨單"
        description="需向同行取貨時建立調貨單"
        Icon={ArrowLeftRight}
        stepLabel="STEP 2.5"
      />
      <HubLinkCard
        title="銷貨單"
        description="客戶確認後建立銷貨單，現銷客同步開發票"
        Icon={ShoppingBag}
        stepLabel="STEP 3"
        href="/dashboard/sale/so"
      />
      <HubLinkCard
        title="銷退單"
        description="客戶退貨時建立銷退單"
        Icon={Undo2}
        stepLabel="STEP 4"
      />
      <HubLinkCard
        title="保固申請"
        description="客戶申請保固，轉交採購向廠商處理"
        Icon={ShieldCheck}
        stepLabel="STEP 5"
      />
    </ModuleHubSection>
  );
}

export default function SaleHubPage() {
  const [active, setActive] = useState<SaleSectionId>('master');

  return (
    <>
      <div className="w-full min-w-0 space-y-6 pb-16 lg:pb-0">
        <header className="space-y-1">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">SALES CENTER</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">銷售中心</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">依流程分區；點選卡片暫導向占位頁（DEMO 主線另接）。</p>
        </header>

        {/* 桌面：所有 section 全列 */}
        <div className="hidden space-y-10 lg:block">
          <MasterSection />
          <DomesticSection />
        </div>

        {/* 手機：只顯示當前 Tab section */}
        <div className="space-y-4 lg:hidden">
          {active === 'master' ? <MasterSection /> : null}
          {active === 'domestic' ? <DomesticSection /> : null}
        </div>
      </div>

      <MobileHubSectionTabs
        tabs={SALE_TABS}
        activeId={active}
        onChange={(id) => setActive(id as SaleSectionId)}
        ariaLabel="銷貨群組切換"
      />
    </>
  );
}
