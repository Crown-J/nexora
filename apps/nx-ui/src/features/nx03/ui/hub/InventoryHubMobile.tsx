// apps/nx-ui/src/features/inventory/ui/hub/InventoryHubMobile.tsx
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 8:庫存中心手機版主元件 — 4 分區架構(仿 SalesHubMobile)。
 *
 * 結構(由上到下):
 *   1. 分區內容(依 ?section= query 動態切換)
 *   2. MobileHubSectionTabs(4 分區切換 Tab,showLabel=true,緊貼螢幕底部)
 *
 * URL query 是 source of truth:?section=status|workstation|documents|warehouse
 * 預設 status(狀態追蹤)。
 *
 * 「中心 = 角色工作台」延伸:倉管中心的第 4 分區 = 倉位管理
 * (而非銷售中心的客戶維護),因為倉管不接觸客戶。
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, LayoutDashboard, MapPin, Wrench } from 'lucide-react';

import {
  MobileHubSectionTabs,
  type MobileHubSectionTabDef,
} from '@design/layout/module-hub/MobileHubSectionTabs';
import { DocumentsSection } from './sections/DocumentsSection';
import { StatusSection } from './sections/StatusSection';
import { WarehouseSection } from './sections/WarehouseSection';
import { WorkstationSection } from './sections/WorkstationSection';

type InventorySection = 'status' | 'workstation' | 'documents' | 'warehouse';

const SECTION_TABS: readonly MobileHubSectionTabDef[] = [
  { id: 'status', label: '狀態追蹤', Icon: LayoutDashboard },
  { id: 'workstation', label: '工作站', Icon: Wrench },
  { id: 'documents', label: '單據管理', Icon: FileText },
  { id: 'warehouse', label: '倉位管理', Icon: MapPin },
];

function isInventorySection(value: string | null): value is InventorySection {
  return (
    value === 'status' ||
    value === 'workstation' ||
    value === 'documents' ||
    value === 'warehouse'
  );
}

export function InventoryHubMobile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('section');
  const current: InventorySection = isInventorySection(raw) ? raw : 'status';

  const handleChange = (id: string) => {
    if (!isInventorySection(id)) return;
    if (id === current) return;
    router.replace(`/dashboard/inventory?section=${id}`, { scroll: false });
  };

  return (
    <div className="lg:hidden">
      {/* 內容區:底部 pb 清出 SectionTabs(h-14 = 56px)+ safe-area 空間 */}
      <div className="pb-[calc(env(safe-area-inset-bottom)+4rem)]">
        {current === 'status' ? <StatusSection /> : null}
        {current === 'workstation' ? <WorkstationSection /> : null}
        {current === 'documents' ? <DocumentsSection /> : null}
        {current === 'warehouse' ? <WarehouseSection /> : null}
      </div>

      <MobileHubSectionTabs
        tabs={SECTION_TABS}
        activeId={current}
        onChange={handleChange}
        ariaLabel="庫存中心分區切換"
        showLabel
      />
    </div>
  );
}
