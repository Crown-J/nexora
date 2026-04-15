/**
 * 庫位管理 + 安全量（路由 v2）
 */

'use client';

import Link from 'next/link';
import { ModulePageNav } from '@/features/layout/ui/ModulePageNav';
import { INVENTORY_NAV_ITEMS } from '@/app/dashboard/inventory/_nav';

export default function InventorySettingPage() {
  return (
    <div className="space-y-4">
      <ModulePageNav items={INVENTORY_NAV_ITEMS} backHref="/dashboard/inventory" backLabel="庫存首頁" />
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY</p>
          <h1 className="text-2xl font-semibold text-foreground">庫位與安全量</h1>
          <p className="text-sm text-muted-foreground">庫位主檔與各倉安全量／最高量設定（對應主流程 I-W04）</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard/nx00/location"
            className="rounded-xl border border-border/80 bg-card/50 p-5 transition hover:border-primary/35 hover:bg-primary/5"
          >
            <h2 className="text-sm font-semibold text-foreground">庫位管理</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">維護倉內庫位主檔（主檔模組）</p>
          </Link>
          <Link
            href="/dashboard/nx02/stock-setting"
            className="rounded-xl border border-border/80 bg-card/50 p-5 transition hover:border-primary/35 hover:bg-primary/5"
          >
            <h2 className="text-sm font-semibold text-foreground">安全量／庫存設定</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">依料號與倉庫設定安全量、最高量等</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
