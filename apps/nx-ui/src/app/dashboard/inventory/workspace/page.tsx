/**
 * 庫存作業工作台（路由 v2）
 */

'use client';

import { ModulePageNav } from '@/features/layout/ui/ModulePageNav';
import { INVENTORY_NAV_ITEMS } from '@/app/dashboard/inventory/_nav';
import { InventoryWorkspacePage } from '@/features/inventory/workspace/ui/InventoryWorkspacePage';

export default function InventoryWorkspaceRoutePage() {
  return (
    <div className="space-y-4">
      <ModulePageNav items={INVENTORY_NAV_ITEMS} backHref="/dashboard/inventory" backLabel="庫存首頁" />
      <InventoryWorkspacePage />
    </div>
  );
}
