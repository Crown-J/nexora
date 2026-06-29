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

import { ArrowLeft, Plus } from 'lucide-react';
import { MasterTabs, type MasterTab } from '@/features/nx01/shell/entity-master/MasterTabs';
// 2026-06-28 執行長：清除右側主檔快速入口按鈕（MasterQuickNav 不再 render；prop 保留向後相容）

export type MasterPageHeadProps = {
  tab: MasterTab;
  onTabChange: (t: MasterTab) => void;
  /** 詳細項標題（tab='detail' 顯示；手機返回列也用） */
  detailTitle?: string;
  /** 副標籤（瀏覽 / 編輯中 / 新增中 等） */
  detailSubtitle?: string;
  /** 當前主檔頁 id（給快速入口 highlight 用、對齊 master-pages.ts 的 id） */
  currentPageId?: string | null;
  /** 手機版「新增」FAB 處理（list 模式右下浮動鈕）；不提供則不顯示 */
  onCreate?: () => void;
};

export function MasterPageHead({
  tab,
  onTabChange,
  detailTitle,
  detailSubtitle,
  onCreate,
}: MasterPageHeadProps) {
  const showDetailTitle = tab === 'detail' && (detailTitle || detailSubtitle);
  return (
    <>
      {/* 桌面：list/detail tabs + 詳細標題 */}
      <div data-nx-frame className="hidden flex-wrap items-center gap-x-3 gap-y-2 md:flex">
        <MasterTabs tab={tab} onChange={onTabChange} />
        {showDetailTitle ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
            <span className="size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
            <h2 className="truncate text-[13px] font-bold tracking-wide text-foreground">{detailTitle}</h2>
            {detailSubtitle ? (
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70 sm:inline">
                {detailSubtitle}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 手機：詳細頁返回列（取代 tabs）*/}
      {tab === 'detail' ? (
        <div className="flex items-center gap-2 border-b border-border bg-background px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => onTabChange('list')}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[13px] text-foreground hover:bg-accent/15"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-foreground">
            {detailTitle ?? '詳細資料'}
          </span>
        </div>
      ) : null}

      {/* 手機：新增 FAB（list 模式 + 有 onCreate）*/}
      {tab === 'list' && onCreate ? (
        <button
          type="button"
          onClick={onCreate}
          aria-label="新增"
          className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 md:hidden"
        >
          <Plus className="h-6 w-6" />
        </button>
      ) : null}
    </>
  );
}
