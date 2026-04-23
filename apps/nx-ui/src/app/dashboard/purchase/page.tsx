// apps/nx-ui/src/app/dashboard/purchase/page.tsx
/**
 * @FUNCTION_CODE NX02-HUB-UI-001-F01
 * 採購中心 Hub（版型對齊 `/dashboard/base`）— R4-C 加 mobile bottom tabs。
 */

'use client';

import { useState } from 'react';
import {
  Briefcase,
  Building2,
  ClipboardList,
  Globe2,
  MessageCircleQuestion,
  Package,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react';

import { HubLinkCard, ModuleHubSection } from '@/features/layout/ui/module-hub/hub-primitives';
import {
  MobileHubSectionTabs,
  type MobileHubSectionTabDef,
} from '@/features/layout/ui/module-hub/MobileHubSectionTabs';

type PurchaseSectionId = 'master' | 'domestic' | 'special';

const PURCHASE_TABS: readonly MobileHubSectionTabDef[] = [
  { id: 'master', label: '主檔管理', Icon: Briefcase },
  { id: 'domestic', label: '國內採購', Icon: Globe2 },
  { id: 'special', label: '特殊採購', Icon: Zap },
];

function MasterSection() {
  return (
    <ModuleHubSection sectionId="purchase-master" title="主檔管理" count={2}>
      <HubLinkCard
        title="產品管理"
        description="定價、安全量、品牌料號規則"
        Icon={Package}
        href="/dashboard/purchase/product"
      />
      <HubLinkCard
        title="供應商管理"
        description="廠商主檔、付款條件、評鑑記錄"
        Icon={Building2}
        href="/dashboard/purchase/vendor"
      />
    </ModuleHubSection>
  );
}

function DomesticSection() {
  return (
    <ModuleHubSection sectionId="purchase-domestic" title="國內採購" count={6}>
      <HubLinkCard
        title="SOP 精品示範 🔥"
        description="手機精品 UX：跟著 9 步走完採購，不漏步驟、內建防呆"
        Icon={Sparkles}
        href="/dashboard/purchase/sop-demo"
      />
      <HubLinkCard
        title="需求"
        description="庫存不足或客訂時建立採購需求；國內採購工作台"
        Icon={ClipboardList}
        stepLabel="STEP 1"
        href="/dashboard/purchase/domestic"
      />
      <HubLinkCard
        title="詢價"
        description="向廠商詢價，等待報價回覆"
        Icon={MessageCircleQuestion}
        stepLabel="STEP 2"
        href="/dashboard/purchase/rfq"
      />
      <HubLinkCard
        title="採購單"
        description="確認廠商報價後建立正式採購單"
        Icon={ShoppingCart}
        stepLabel="STEP 3"
        href="/dashboard/purchase/po"
      />
      <HubLinkCard
        title="進貨單"
        description="貨物到達後執行驗收入帳"
        Icon={Truck}
        stepLabel="STEP 4"
        href="/dashboard/purchase/rr"
      />
      <HubLinkCard
        title="退貨單"
        description="驗收異常時退還廠商"
        Icon={RotateCcw}
        stepLabel="STEP 5"
      />
    </ModuleHubSection>
  );
}

function SpecialSection() {
  return (
    <ModuleHubSection sectionId="purchase-special" title="特殊採購" count={3}>
      <HubLinkCard
        title="採購單"
        description="掃貨或機會採購直接建立採購單"
        Icon={Zap}
        stepLabel="STEP 1"
      />
      <HubLinkCard
        title="進貨單"
        description="現場驗收後入帳"
        Icon={Truck}
        stepLabel="STEP 2"
      />
      <HubLinkCard
        title="退貨單"
        description="驗收異常退貨"
        Icon={RotateCcw}
        stepLabel="STEP 3"
      />
    </ModuleHubSection>
  );
}

export default function PurchaseHubPage() {
  // R5：預設進「國內採購」tab，讓手機一開採購中心就看到 SOP 精品示範入口
  const [active, setActive] = useState<PurchaseSectionId>('domestic');

  return (
    <>
      <div className="w-full min-w-0 space-y-6 pb-16 lg:pb-0">
        <header className="space-y-1">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">PURCHASE CENTER</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">採購中心</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">依流程分區；點選卡片暫導向占位頁（DEMO 主線另接）。</p>
        </header>

        {/* 桌面：所有 section 全列 */}
        <div className="hidden space-y-10 lg:block">
          <MasterSection />
          <DomesticSection />
          <SpecialSection />
        </div>

        {/* 手機：只顯示當前 Tab section */}
        <div className="space-y-4 lg:hidden">
          {active === 'master' ? <MasterSection /> : null}
          {active === 'domestic' ? <DomesticSection /> : null}
          {active === 'special' ? <SpecialSection /> : null}
        </div>
      </div>

      <MobileHubSectionTabs
        tabs={PURCHASE_TABS}
        activeId={active}
        onChange={(id) => setActive(id as PurchaseSectionId)}
        ariaLabel="採購群組切換"
      />
    </>
  );
}
