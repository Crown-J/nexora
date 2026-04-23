// apps/nx-ui/src/features/sale/ui/hub/SalesHubMobile.tsx
/**
 * R7 銷售中心手機版主元件 — 4 分區架構。
 *
 * 結構（由上到下）：
 *   1. 分區內容（依 ?section= query 動態切換）
 *   2. SalesSectionTabs（4 分區切換 Tab，showLabel=true，位於 DOCK 上方）
 *   3. 全站 DOCK（由 dock.tsx 負責渲染，跨中心切換）
 *
 * URL query 是 source of truth：?section=status|workstation|documents|customer
 * 預設 status（狀態追蹤）。
 *
 * Phase 2 只做 StatusSection；工作站 / 單據 / 客戶為 placeholder，Phase 3/4 補。
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Hammer, LayoutDashboard, Users, Wrench } from 'lucide-react';

import {
  MobileHubSectionTabs,
  type MobileHubSectionTabDef,
} from '@/features/layout/ui/module-hub/MobileHubSectionTabs';
import { StatusSection } from './sections/StatusSection';

type SaleSection = 'status' | 'workstation' | 'documents' | 'customer';

const SECTION_TABS: readonly MobileHubSectionTabDef[] = [
  { id: 'status', label: '狀態追蹤', Icon: LayoutDashboard },
  { id: 'workstation', label: '工作站', Icon: Wrench },
  { id: 'documents', label: '單據管理', Icon: FileText },
  { id: 'customer', label: '客戶維護', Icon: Users },
];

/** DOCK 高度（px）— 與首頁 iOS 風格 DOCK 實測一致 */
const DOCK_HEIGHT_PX = 74;

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
      {/* 內容區：底部 pb 要夠高，清出 SectionTabs + DOCK 的空間 */}
      <div className="pb-[140px]">
        {current === 'status' ? <StatusSection /> : null}
        {current === 'workstation' ? <SectionPlaceholder title="工作站" /> : null}
        {current === 'documents' ? <SectionPlaceholder title="單據管理" /> : null}
        {current === 'customer' ? <SectionPlaceholder title="客戶維護" /> : null}
      </div>

      <MobileHubSectionTabs
        tabs={SECTION_TABS}
        activeId={current}
        onChange={handleChange}
        ariaLabel="銷售中心分區切換"
        showLabel
        offsetBottom={DOCK_HEIGHT_PX}
      />
    </div>
  );
}

function SectionPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
        <Hammer className="h-7 w-7 text-white/40" aria-hidden />
      </div>
      <div className="mb-2 text-base text-white">{title}</div>
      <div className="max-w-xs text-xs text-white/50">
        此分區將於後續版本推出，敬請期待。
      </div>
    </div>
  );
}
