// apps/nx-ui/src/design/components/master-batch/SubjectPanel.tsx
// 主檔群組模板 — 左欄面板（搜尋 + 主體列表）
//
// flat 模式：渲染 button list、選中加金色左 3px 邊條 + gradient
// tree 模式：Step 3/4（組織/據點架構圖）才實作；目前留 stub
'use client';

import { Plus, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@design/utils/cn';

import type { LeftMode } from './types';

export type SubjectPanelProps<S> = {
  mode: LeftMode;
  subjectIcon?: LucideIcon;
  subjectNoun: string;
  searchPlaceholder?: string;
  query: string;
  onQueryChange: (q: string) => void;

  // flat
  totalCount: number;
  subjects: S[];
  subjectIdOf: (s: S) => string;
  subjectTitleOf?: (s: S) => string;
  subjectCountOf?: (s: S) => number;
  selectedId: string | null;
  focusedIdx: number;
  onSelect: (id: string, index: number) => void;

  // create
  leftCreatable?: boolean;
  createLabel?: string;
  onCreate?: () => void;
};

export function SubjectPanel<S>(props: SubjectPanelProps<S>) {
  const {
    mode,
    subjectIcon: SubjectIcon,
    subjectNoun,
    searchPlaceholder,
    query,
    onQueryChange,
    totalCount,
    subjects,
    subjectIdOf,
    subjectTitleOf,
    subjectCountOf,
    selectedId,
    focusedIdx,
    onSelect,
    leftCreatable,
    createLabel = '新增',
    onCreate,
  } = props;

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/95',
        'backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_26px_60px_-34px_rgba(0,0,0,0.7)]',
      )}
    >
      {/* 標頭 */}
      <div className="flex flex-none items-center gap-2.5 border-b border-border/60 px-4 py-3">
        {SubjectIcon ? <SubjectIcon className="size-4 text-[#E8A020]" /> : null}
        <span className="truncate text-sm font-semibold tracking-wide text-foreground">
          {subjectNoun}
        </span>
        <span className="flex-1" />
        {leftCreatable && onCreate ? (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/12 px-2.5 text-xs font-semibold text-[#E8A020] transition-colors hover:bg-[#E8A020]/20"
            title={`新增${subjectNoun}`}
          >
            <Plus className="size-3.5" />
            {createLabel}
          </button>
        ) : null}
        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
          {totalCount} 項
        </span>
      </div>

      {/* 搜尋 */}
      <div className="relative flex-none border-b border-border/60 px-3 py-2.5">
        <Search className="pointer-events-none absolute left-[18px] top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={searchPlaceholder ?? `搜尋${subjectNoun}…`}
          className={cn(
            'h-8 w-full rounded-md border border-border bg-background/60 pl-9 pr-3 text-sm text-foreground',
            'outline-none transition-colors placeholder:text-muted-foreground',
            'focus:border-[#E8A020]/55 focus:shadow-[0_0_0_3px_rgba(232,160,32,0.13)]',
          )}
        />
      </div>

      {/* 列表 */}
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {mode === 'tree' ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            Tree mode TODO（Step 3/4 補：組織架構 / 據點架構）
          </div>
        ) : subjects.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            {query ? `查無符合「${query}」的${subjectNoun}` : `尚無${subjectNoun}`}
          </div>
        ) : (
          subjects.map((s, i) => {
            const id = subjectIdOf(s);
            const isSelected = id === selectedId;
            const isFocused = i === focusedIdx;
            const title = subjectTitleOf?.(s) ?? id;
            const count = subjectCountOf?.(s);
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id, i)}
                className={cn(
                  'mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors',
                  isSelected
                    ? 'bg-gradient-to-r from-[#E8A020]/15 to-[#E8A020]/5 shadow-[inset_3px_0_0_#E8A020,inset_0_0_0_1px_rgba(232,160,32,0.28)]'
                    : 'hover:bg-accent/30',
                  isFocused && !isSelected && 'ring-1 ring-inset ring-[#E8A020]/45',
                )}
              >
                <span
                  className={cn(
                    'grid size-8 flex-none place-items-center rounded-lg',
                    isSelected
                      ? 'bg-[#E8A020]/26 text-[#E8A020]'
                      : 'bg-[#E8A020]/14 text-[#E8A020]',
                  )}
                >
                  {SubjectIcon ? <SubjectIcon className="size-4" /> : null}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {title}
                </span>
                {count !== undefined ? (
                  <span
                    className={cn(
                      'flex-none font-mono text-[11px] tabular-nums',
                      isSelected ? 'text-[#E8A020]' : 'text-muted-foreground',
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
