// apps/nx-ui/src/features/nx01/shell/master-nav/MasterPageHead.tsx
// 2026-06-18 主檔頁頂部頭區（含 tabs / detail 標題 / 主檔快速入口 bar）
//
// 三排結構：
//   row 1: [資料瀏覽 Alt+1] [詳細資料 Alt+2]    ← 詳細項標題 + 副標 (僅 detail tab 顯示)
//   row 2: ←  [組織 ▸ 員工 職務 部門 組別 | 權限 ▸ ... | ...]  →
//
// row 1 對齊 Hana demo：當點選詳細資料時、標題（如「測試租戶管理員（LITE）」）
//   出現在 tabs 同一排右邊、不再放詳細頁內部 SectionHeader。

'use client';

import { MasterTabs, type MasterTab } from '@/features/nx01/shell/entity-master/MasterTabs';
import { MasterQuickNav } from './MasterQuickNav';

export type MasterPageHeadProps = {
  tab: MasterTab;
  onTabChange: (t: MasterTab) => void;
  /** 詳細項標題（僅在 tab='detail' 顯示在 tabs 右邊） */
  detailTitle?: string;
  /** 副標籤（瀏覽 / 編輯中 / 新增中 等） */
  detailSubtitle?: string;
  /** 當前主檔頁 id（給快速入口 highlight 用、對齊 master-pages.ts 的 id） */
  currentPageId?: string | null;
};

export function MasterPageHead({
  tab,
  onTabChange,
  detailTitle,
  detailSubtitle,
  currentPageId,
}: MasterPageHeadProps) {
  const showDetailTitle = tab === 'detail' && (detailTitle || detailSubtitle);
  return (
    <div className="flex flex-col gap-2.5">
      {/* row 1: tabs 左 + detail 標題右 */}
      <div className="flex items-center justify-between gap-3">
        <MasterTabs tab={tab} onChange={onTabChange} />
        {showDetailTitle ? (
          <div className="flex min-w-0 items-center gap-2.5 truncate">
            <span className="size-1.5 shrink-0 rounded-full bg-[#E8A020] shadow-[0_0_8px_#E8A020]" />
            <h2 className="truncate text-sm font-bold tracking-wide text-foreground">
              {detailTitle}
            </h2>
            {detailSubtitle ? (
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/70 sm:inline">
                {detailSubtitle}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {/* row 2: 主檔快速入口 bar */}
      <MasterQuickNav currentPageId={currentPageId} />
    </div>
  );
}
