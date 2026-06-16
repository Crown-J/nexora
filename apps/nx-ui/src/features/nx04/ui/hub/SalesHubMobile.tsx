// apps/nx-ui/src/features/sale/ui/hub/SalesHubMobile.tsx
/**
 * R7 銷售中心手機版主元件 — 4 分區架構。
 *
 * 結構（由上到下）：
 *   1. 分區內容（依 ?section= query 動態切換）
 *   2. SectionTabs（4 分區切換 Tab，showLabel=true，緊貼螢幕底部）
 *
 * R7 Phase 2.5：底部 DOCK 已移除（中心 = 角色工作台，跨中心由 TopBar 星球承擔），
 * 所以 SectionTabs 直接貼底，不再需要 offsetBottom。
 *
 * URL query 是 source of truth：?section=status|workstation|documents|customer
 * 預設 status（狀態追蹤）。
 *
 * Phase 4 起 4 個分區都有正式元件。
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, LayoutDashboard, Users, Wrench } from 'lucide-react';

import {
  MobileHubSectionTabs,
  type MobileHubSectionTabDef,
} from '@design/layout/module-hub/MobileHubSectionTabs';
import { CustomerSection } from './sections/CustomerSection';
import { DocumentsSection } from './sections/DocumentsSection';
import { StatusSection } from './sections/StatusSection';
import { WorkstationSection } from './sections/WorkstationSection';

type SaleSection = 'status' | 'workstation' | 'documents' | 'customer';

const SECTION_TABS: readonly MobileHubSectionTabDef[] = [
  { id: 'status', label: '狀態追蹤', Icon: LayoutDashboard },
  { id: 'workstation', label: '工作站', Icon: Wrench },
  { id: 'documents', label: '單據管理', Icon: FileText },
  { id: 'customer', label: '客戶維護', Icon: Users },
];

function isSaleSection(value: string | null): value is SaleSection {
  return (
    value === 'status' ||
    value === 'workstation' ||
    value === 'documents' ||
    value === 'customer'
  );
}

export function SalesHubMobile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('section');
  const current: SaleSection = isSaleSection(raw) ? raw : 'status';

  const handleChange = (id: string) => {
    if (!isSaleSection(id)) return;
    if (id === current) return;
    router.replace(`/dashboard/sale?section=${id}`, { scroll: false });
  };

  return (
    <div className="lg:hidden">
      {/* 內容區：底部 pb 清出 SectionTabs（h-14 = 56px）+ safe-area 空間 */}
      <div className="pb-[calc(env(safe-area-inset-bottom)+4rem)]">
        {current === 'status' ? <StatusSection /> : null}
        {current === 'workstation' ? <WorkstationSection /> : null}
        {current === 'documents' ? <DocumentsSection /> : null}
        {current === 'customer' ? <CustomerSection /> : null}
      </div>

      <MobileHubSectionTabs
        tabs={SECTION_TABS}
        activeId={current}
        onChange={handleChange}
        ariaLabel="銷售中心分區切換"
        showLabel
      />
    </div>
  );
}
