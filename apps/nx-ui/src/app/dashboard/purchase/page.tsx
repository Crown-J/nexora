/**
 * @FUNCTION_CODE NX02-HUB-UI-001-F01
 * 採購中心 Hub（版型對齊 `/dashboard/base`）
 */

'use client';

import {
  Building2,
  ClipboardList,
  MessageCircleQuestion,
  Package,
  RotateCcw,
  ShoppingCart,
  Truck,
  Zap,
} from 'lucide-react';

import { HubLinkCard, ModuleHubSection } from '@/features/layout/ui/module-hub/hub-primitives';

export default function PurchaseHubPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">PURCHASE CENTER</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">採購中心</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">依流程分區；點選卡片暫導向占位頁（DEMO 主線另接）。</p>
      </header>

      <div className="space-y-10">
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

        <ModuleHubSection sectionId="purchase-domestic" title="國內採購" count={5}>
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
      </div>
    </div>
  );
}
