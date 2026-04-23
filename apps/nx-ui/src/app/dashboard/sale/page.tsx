// apps/nx-ui/src/app/dashboard/sale/page.tsx
/**
 * @FUNCTION_CODE NX04-HUB-UI-001-F01
 * 銷售中心 Hub — R7：手機版改成 4 分區架構（狀態追蹤 / 工作站 / 單據 / 客戶）。
 *
 * 桌面版維持原樣（待後續重構），手機版完全走新元件 SalesHubMobile。
 *
 * R7 Phase 6：桌面版 DomesticSection 移除「SOP 精品示範 🔥」入口卡。
 *   新結構下國內銷售 = 工作站分區的項目，不再需要「特殊精品」badge。
 *   桌面版剩下的 STEP 1~5 占位卡片保留，等後續桌面版重構處理。
 */

'use client';

import {
  ArrowLeftRight,
  FileSpreadsheet,
  MessageCircleQuestion,
  Search,
  ShieldCheck,
  ShoppingBag,
  Undo2,
  Users,
} from 'lucide-react';

import { HubLinkCard, ModuleHubSection } from '@/features/layout/ui/module-hub/hub-primitives';
import { SalesHubMobile } from '@/features/sale/ui/hub/SalesHubMobile';

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
  return (
    <>
      {/* 桌面版：維持原 2 section 結構 */}
      <div className="hidden w-full min-w-0 space-y-6 pb-0 lg:block">
        <header className="space-y-1">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">SALES CENTER</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">銷售中心</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            依流程分區；點選卡片暫導向占位頁（DEMO 主線另接）。
          </p>
        </header>

        <div className="space-y-10">
          <MasterSection />
          <DomesticSection />
        </div>
      </div>

      {/* 手機版：R7 新 4 分區架構 */}
      <SalesHubMobile />
    </>
  );
}
