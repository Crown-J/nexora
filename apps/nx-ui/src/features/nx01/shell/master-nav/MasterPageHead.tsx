// apps/nx-ui/src/features/nx01/shell/master-nav/MasterPageHead.tsx
// 2026-06-18 主檔頁頂部頭區（執行長 v2 範式：全部同一排）
//
// 單一排 layout：
//   [資料瀏覽][詳細資料] [標題 · 副標]  ........  [← 分組 icon × N →]
//                  ↑                                              ↑
//             tabs 緊鄰標題（不推遠）            主檔快速入口 nav 推到最右
//
// detail tab 時才顯示標題（沿用 Hana demo「詳細資料」標題顯示時機）

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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <MasterTabs tab={tab} onChange={onTabChange} />
      {showDetailTitle ? (
        <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
          <span className="size-1.5 shrink-0 rounded-full bg-[#E8A020] shadow-[0_0_8px_#E8A020]" />
          <h2 className="truncate text-[13px] font-bold tracking-wide text-foreground">
            {detailTitle}
          </h2>
          {detailSubtitle ? (
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70 sm:inline">
              {detailSubtitle}
            </span>
          ) : null}
        </div>
      ) : (
        // 沒標題時用 flex-1 spacer 把 nav 推到最右
        <div className="flex-1" />
      )}
      {/* 主檔快速入口（icon 按鈕 + 翻頁切分組）→ 永遠最右 */}
      <MasterQuickNav currentPageId={currentPageId} />
    </div>
  );
}
