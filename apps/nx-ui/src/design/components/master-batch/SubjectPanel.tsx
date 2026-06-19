// apps/nx-ui/src/design/components/master-batch/SubjectPanel.tsx
// 主檔群組模板 — 左欄面板（搜尋 + 主體列表）
//
// flat 模式：FlatRow（金色左 3px 邊條 + gradient 表選中）
// tree 模式：TreeRow（縮排 level*16px + chevron 獨立按鈕）
//   - chevron 點擊：toggle expand（stopPropagation 不觸發 select）
//   - row body 點擊：isSelectable → select；否則 → toggle expand
//
// tree mode 暫不支援搜尋（input 隱藏）；後續軌可補「過濾葉子 + 自動展開 ancestor」
'use client';

import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@design/utils/cn';

import type { LeftMode } from './types';

export type TreeRowVM = {
  id: string;
  level: number;
  hasChildren: boolean;
  expanded: boolean;
  isSelectable: boolean;
  title: string;
  count?: number;
};

export type SubjectPanelProps<S> = {
  mode: LeftMode;
  subjectIcon?: LucideIcon;
  subjectNoun: string;
  searchPlaceholder?: string;
  query: string;
  onQueryChange: (q: string) => void;
  totalCount: number;

  // flat
  subjects: S[];
  subjectIdOf: (s: S) => string;
  subjectTitleOf?: (s: S) => string;
  subjectCountOf?: (s: S) => number | undefined;
  selectedId: string | null;
  focusedIdx: number;
  onSelect: (id: string, index: number) => void;

  // tree
  treeRows?: TreeRowVM[];
  onToggleExpand?: (id: string) => void;

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
    treeRows,
    onToggleExpand,
    leftCreatable,
    createLabel = '新增',
    onCreate,
  } = props;

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-md',
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

      {/* 搜尋 — tree mode 暫不支援、不渲染 */}
      {mode === 'flat' ? (
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
      ) : null}

      {/* 列表 */}
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {mode === 'tree' ? (
          treeRows && treeRows.length > 0 ? (
            treeRows.map((row, i) => (
              <TreeRow
                key={row.id}
                row={row}
                icon={SubjectIcon}
                isSelected={row.id === selectedId}
                isFocused={i === focusedIdx}
                onBodyClick={() => {
                  if (row.isSelectable) onSelect(row.id, i);
                  else if (row.hasChildren) onToggleExpand?.(row.id);
                }}
                onChevronClick={() => onToggleExpand?.(row.id)}
              />
            ))
          ) : (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              尚無{subjectNoun}
            </div>
          )
        ) : subjects.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            {query ? `查無符合「${query}」的${subjectNoun}` : `尚無${subjectNoun}`}
          </div>
        ) : (
          subjects.map((s, i) => {
            const id = subjectIdOf(s);
            return (
              <FlatRow
                key={id}
                icon={SubjectIcon}
                title={subjectTitleOf?.(s) ?? id}
                count={subjectCountOf?.(s)}
                isSelected={id === selectedId}
                isFocused={i === focusedIdx}
                onClick={() => onSelect(id, i)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

/* ============ Flat row ============ */
function FlatRow({
  icon: Icon,
  title,
  count,
  isSelected,
  isFocused,
  onClick,
}: {
  icon?: LucideIcon;
  title: string;
  count?: number;
  isSelected: boolean;
  isFocused: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
          isSelected ? 'bg-[#E8A020]/26 text-[#E8A020]' : 'bg-[#E8A020]/14 text-[#E8A020]',
        )}
      >
        {Icon ? <Icon className="size-4" /> : null}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{title}</span>
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
}

/* ============ Tree row（chevron + body 兩個獨立按鈕） ============ */
function TreeRow({
  row,
  icon: Icon,
  isSelected,
  isFocused,
  onBodyClick,
  onChevronClick,
}: {
  row: TreeRowVM;
  icon?: LucideIcon;
  isSelected: boolean;
  isFocused: boolean;
  onBodyClick: () => void;
  onChevronClick: () => void;
}) {
  const indent = row.level * 16;
  const showSelectedStyle = row.isSelectable && isSelected;
  return (
    <div
      className={cn(
        'mb-0.5 flex w-full items-center gap-1 rounded-lg transition-colors',
        showSelectedStyle
          ? 'bg-gradient-to-r from-[#E8A020]/15 to-[#E8A020]/5 shadow-[inset_3px_0_0_#E8A020,inset_0_0_0_1px_rgba(232,160,32,0.28)]'
          : 'hover:bg-accent/30',
        isFocused && !showSelectedStyle && 'ring-1 ring-inset ring-[#E8A020]/45',
      )}
      style={{ paddingLeft: indent }}
    >
      {row.hasChildren ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChevronClick();
          }}
          className="grid size-6 flex-none place-items-center rounded text-muted-foreground hover:bg-accent/40"
          title={row.expanded ? '折疊' : '展開'}
          aria-label={row.expanded ? '折疊' : '展開'}
        >
          {row.expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>
      ) : (
        <span className="size-6 flex-none" />
      )}
      <button
        type="button"
        onClick={onBodyClick}
        className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-left"
      >
        {Icon ? (
          <span
            className={cn(
              'grid size-7 flex-none place-items-center rounded-md',
              showSelectedStyle ? 'bg-[#E8A020]/26 text-[#E8A020]' : 'bg-[#E8A020]/12 text-[#E8A020]',
            )}
          >
            <Icon className="size-3.5" />
          </span>
        ) : null}
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm',
            row.isSelectable ? 'text-foreground' : 'font-medium text-foreground/90',
          )}
        >
          {row.title}
        </span>
        {row.count !== undefined ? (
          <span
            className={cn(
              'flex-none font-mono text-[11px] tabular-nums',
              showSelectedStyle ? 'text-[#E8A020]' : 'text-muted-foreground',
            )}
          >
            {row.count}
          </span>
        ) : null}
      </button>
    </div>
  );
}
