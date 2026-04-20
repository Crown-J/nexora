/**
 * @FUNCTION_CODE NX03-HUB-UI-001-F01
 * 庫存中心 Hub（版型對齊 `/dashboard/base`）
 */

'use client';

import {
  Box,
  ClipboardCheck,
  ClipboardList,
  Layers,
  MapPin,
  Package,
  ScanLine,
  Truck,
} from 'lucide-react';

import { HubLinkCard, ModuleHubSection } from '@/features/layout/ui/module-hub/hub-primitives';

export default function InventoryHubPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY CENTER</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">庫存中心</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">依流程分區；點選卡片暫導向占位頁（DEMO 主線另接）。</p>
      </header>

      <div className="space-y-10">
        <ModuleHubSection sectionId="inv-master" title="主檔管理" count={2}>
          <HubLinkCard
            title="倉位/庫位管理"
            description="倉庫與庫位設定、坪效記錄"
            Icon={MapPin}
          />
          <HubLinkCard
            title="產品管理"
            description="依坪效建議安全量與最高量給採購參考"
            Icon={Layers}
          />
        </ModuleHubSection>

        <ModuleHubSection sectionId="inv-ship" title="出貨" count={3}>
          <HubLinkCard title="撿貨" description="依銷貨單撿取貨物" Icon={ClipboardList} stepLabel="STEP 1" />
          <HubLinkCard title="包貨" description="確認數量後包裝封箱" Icon={Box} stepLabel="STEP 2" />
          <HubLinkCard title="送貨" description="配送、自取或寄貨出貨" Icon={Truck} stepLabel="STEP 3" />
        </ModuleHubSection>

        <ModuleHubSection sectionId="inv-receive" title="進貨" count={2}>
          <HubLinkCard title="驗貨" description="貨物到達後逐筆核對料號數量外觀" Icon={ClipboardCheck} stepLabel="STEP 1" />
          <HubLinkCard title="上架" description="驗收入帳後搬至指定庫位上架" Icon={Package} stepLabel="STEP 2" />
        </ModuleHubSection>

        <ModuleHubSection sectionId="inv-count" title="盤點" count={1}>
          <HubLinkCard
            title="盤點"
            description="定期或臨時清點庫存，確認帳實相符"
            Icon={ScanLine}
            stepLabel="STEP 1"
          />
        </ModuleHubSection>
      </div>
    </div>
  );
}
