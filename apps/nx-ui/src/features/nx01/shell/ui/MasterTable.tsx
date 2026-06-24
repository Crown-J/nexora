// apps/nx-ui/src/features/nx01/shell/ui/MasterTable.tsx
/**
 * NEXORA Master Shell — MasterTable（泛型主檔列表）
 *
 * 軌 B2 2026-06-18 對齊 Hana demo .nx-table 樣式:
 * - 全 hex 改 semantic tokens（自動 light/dark theme）
 * - thead sticky + 半透明背景 + backdrop-blur
 * - selected row gold tint 12% + 3px 左 gold bar（shadow inset）
 * - footer 對齊 .nx-tfoot
 *
 * 行為不變:
 * - 泛型欄位配置（MasterTableColumn<T>）：每個 column 自訂 render
 * - 第一欄自動：瀏覽 → 序號 / 選取 → checkbox
 * - 鍵盤導航（focus row、↑↓ 切列、Enter 進編輯）
 * - placeholder rows 填滿 pageSize
 */
'use client';

import { ChevronDown } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@design/primitives/dropdown-menu';
import { cn } from '@design/utils/cn';

export const MASTER_TABLE_PAGE_SIZES = [10, 20, 50, 100] as const;

/** 2026-06-18 表頭拖拉子元件（dnd-kit useSortable）*/
function DraggableTh<T>({
  col,
  sortKey,
  onSortKeyChange,
}: {
  col: MasterTableColumn<T>;
  sortKey?: string;
  onSortKeyChange?: (key: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: col.key,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    touchAction: 'none',
  };
  return (
    <th
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'whitespace-nowrap select-none px-3 py-[9px]',
        col.minWidthClass,
        isDragging && 'bg-[#E8A020]/10',
      )}
      title="拖動以重新排列欄位順序"
    >
      {col.sortable && onSortKeyChange ? (
        <button
          type="button"
          onClick={() => onSortKeyChange(col.key)}
          className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
        >
          {col.label}
          <ChevronDown className={cn('size-3', sortKey === col.key && 'text-[#E8A020]')} />
        </button>
      ) : (
        col.label
      )}
    </th>
  );
}

export type MasterTableColumn<T> = {
  /** 對齊排序時的 sortKey；亦用於 React key */
  key: string;
  label: string;
  /** Tailwind min-w-[...] 字面值；e.g. 'min-w-[140px]' */
  minWidthClass?: string;
  /** 是否可排序（顯示 chevron 圖示）*/
  sortable?: boolean;
  /** 自訂渲染 */
  render: (row: T, index: number) => React.ReactNode;
};

export function MasterTable<T>({
  columns,
  rows,
  getRowId,
  selectedId,
  onSelect,
  onOpenDetail,
  selectionMode,
  checked,
  setChecked,
  pageSize = 20,
  onPageSizeChange,
  hidePageSizeArea = false,
  sortKey,
  onSortKeyChange,
  onColumnOrderChange,
  footerHint,
  totalCount,
}: {
  columns: MasterTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenDetail: (id: string) => void;
  selectionMode: boolean;
  checked: Set<string>;
  setChecked: (next: Set<string>) => void;
  pageSize?: number;
  /** 提供時 footer「每頁 N 筆」變 dropdown 選擇器（10/20/50/100），未提供時為純顯示 */
  onPageSizeChange?: (next: number) => void;
  /** 2026-06-24 取消分頁範式：true 時 footer 右側「每頁 N 筆」整塊不顯（給固定 pageSize=100 一次撈全用） */
  hidePageSizeArea?: boolean;
  sortKey?: string;
  onSortKeyChange?: (key: string) => void;
  /** 2026-06-18 表頭拖拉重排欄位順序回 callback；提供時 thead 啟用 dnd
   *  next 是新的 column key 順序、caller 應持久化（localStorage 等） */
  onColumnOrderChange?: (next: string[]) => void;
  footerHint?: string;
  totalCount?: number;
}) {
  const total = totalCount ?? rows.length;

  const toggleRow = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  };

  const toggleAll = () => {
    if (checked.size === rows.length && rows.length > 0) {
      setChecked(new Set());
    } else {
      setChecked(new Set(rows.map(getRowId)));
    }
  };

  // ↑↓ 在表格內 = 切換 row 焦點；Enter 在 row = 進入編輯
  const handleTableKey = (e: React.KeyboardEvent) => {
    const active = document.activeElement as HTMLElement | null;
    if (!active || !active.hasAttribute('data-row-id')) return;

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const rowEls = Array.from(
        e.currentTarget.querySelectorAll<HTMLTableRowElement>('[data-row-id]'),
      );
      if (rowEls.length === 0) return;
      const idx = rowEls.indexOf(active as HTMLTableRowElement);
      const nextIdx =
        e.key === 'ArrowDown'
          ? Math.min(rowEls.length - 1, idx + 1)
          : Math.max(0, idx - 1);
      e.preventDefault();
      const nextRow = rowEls[nextIdx];
      nextRow?.focus();
      const nextId = nextRow?.getAttribute('data-row-id');
      if (nextId) onSelect(nextId);
    } else if (e.key === 'Enter') {
      const id = active.getAttribute('data-row-id');
      if (id) {
        e.preventDefault();
        onOpenDetail(id);
      }
    }
  };

  const placeholders = Math.max(0, pageSize - rows.length);

  // 2026-06-18 表頭拖拉重排（dnd-kit）—— onColumnOrderChange 提供時啟用
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const columnKeys = columns.map((c) => c.key);
  const handleColumnDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id || !onColumnOrderChange) return;
    const oldIdx = columnKeys.indexOf(String(active.id));
    const newIdx = columnKeys.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    const next = [...columnKeys];
    const [moved] = next.splice(oldIdx, 1);
    next.splice(newIdx, 0, moved);
    onColumnOrderChange(next);
  };

  // 2026-06-18 hydration fix:DndContext 內部 render screen-reader div、
  //   不能塞 <tr> 子層（HTML 規範違反）。改包整個 <table> 外、Sortable items 仍能找到 DraggableTh。
  const tableBody = (
    <div
      className="flex-1 overflow-auto nx-master-scroll [scroll-padding-top:48px]"
      onKeyDown={handleTableKey}
    >
      <table className="w-full border-collapse text-[13px]">
        <thead className="sticky top-0 z-10 border-b border-border/40 bg-card/95 backdrop-blur-md">
          <tr className="text-left text-[11.5px] font-semibold uppercase tracking-[0.02em] text-muted-foreground">
            <th className="w-12 px-3 py-[9px]">
              {selectionMode ? (
                <input
                  type="checkbox"
                  checked={checked.size === rows.length && rows.length > 0}
                  onChange={toggleAll}
                  className="size-3.5 rounded border-border/60 bg-card accent-[#E8A020]"
                  aria-label="全選"
                />
              ) : (
                <span className="font-medium">序號</span>
              )}
            </th>
            {onColumnOrderChange
              ? columns.map((col) => (
                  <DraggableTh
                    key={col.key}
                    col={col}
                    sortKey={sortKey}
                    onSortKeyChange={onSortKeyChange}
                  />
                ))
              : columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn('whitespace-nowrap px-3 py-[9px]', col.minWidthClass)}
                  >
                    {col.sortable && onSortKeyChange ? (
                      <button
                        type="button"
                        onClick={() => onSortKeyChange(col.key)}
                        className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                      >
                        {col.label}
                        <ChevronDown
                          className={cn('size-3', sortKey === col.key && 'text-[#E8A020]')}
                        />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const id = getRowId(row);
            const isChecked = checked.has(id);
            const isSelected = selectedId === id;
            const isEvenRow = i % 2 === 1;
            return (
              <tr
                key={id}
                data-row-id={id}
                tabIndex={0}
                onClick={() => onSelect(id)}
                onDoubleClick={() => onOpenDetail(id)}
                className={cn(
                  'cursor-pointer border-b border-border/20 outline-none transition-colors',
                  'focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#E8A020]/60',
                  isSelected
                    ? 'bg-[#E8A020]/12 shadow-[inset_3px_0_0_#E8A020] hover:bg-[#E8A020]/16'
                    : selectionMode && isChecked
                      ? 'bg-[#E8A020]/8'
                      : cn(isEvenRow && 'bg-foreground/[0.05]', 'hover:bg-accent/10'),
                )}
              >
                <td className="px-3 py-[10px]" onClick={(e) => selectionMode && e.stopPropagation()}>
                  {selectionMode ? (
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleRow(id)}
                      className="size-3.5 rounded border-border/60 bg-card accent-[#E8A020]"
                      aria-label={`選取 ${id}`}
                    />
                  ) : (
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground/70">
                      {String(i + 1).padStart(4, '0')}
                    </span>
                  )}
                </td>
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-[10px] text-foreground">
                    {col.render(row, i)}
                  </td>
                ))}
              </tr>
            );
          })}
          {Array.from({ length: placeholders }).map((_, i) => {
            const visualIdx = rows.length + i;
            const isEvenRow = visualIdx % 2 === 1;
            return (
              <tr
                key={`__placeholder_${i}`}
                aria-hidden
                className={cn(
                  'pointer-events-none select-none border-b border-border/10',
                  isEvenRow && 'bg-foreground/[0.05]',
                )}
              >
                <td className="px-3 py-[10px]">&nbsp;</td>
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-[10px]">&nbsp;</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // dnd 啟用時、外包 DndContext + SortableContext（context 純 React tree、不渲染 DOM 到 tr 內）
  const tableWithDnd = onColumnOrderChange ? (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColumnDragEnd}>
      <SortableContext items={columnKeys} strategy={horizontalListSortingStrategy}>
        {tableBody}
      </SortableContext>
    </DndContext>
  ) : (
    tableBody
  );

  return (
    <div
      data-nx-frame
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/40 bg-card/70"
    >
      {tableWithDnd}

      {/* footer 對齊 demo .nx-tfoot */}
      <div className="flex items-center gap-[14px] border-t border-border/40 bg-card/80 px-[14px] py-[10px] text-[12.5px] text-muted-foreground">
        <span className="font-variant-numeric tabular-nums">
          共 <span className="text-foreground">{total}</span> 筆 · 顯示 {rows.length} 筆
          {footerHint ? ` · ${footerHint}` : ''}
        </span>
        {hidePageSizeArea ? null : (
          <div className="ml-auto">
            {onPageSizeChange ? (
              <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
            ) : (
              <span className="text-muted-foreground/70">每頁 {pageSize} 筆</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PageSizeSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="調整每頁筆數"
          className={cn(
            'inline-flex h-[30px] items-center gap-1 rounded-md border border-border/40 bg-background/60 px-2 text-[12px] font-medium text-foreground transition-all hover:border-border/60 hover:bg-background',
            'data-[state=open]:border-[#E8A020]/40 data-[state=open]:bg-[#E8A020]/10 data-[state=open]:text-[#E8A020]',
          )}
        >
          每頁 <span className="font-mono tabular-nums">{value}</span> 筆
          <ChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="min-w-[7rem] border-border/40 bg-popover/95 p-1 shadow-2xl backdrop-blur-xl"
      >
        {MASTER_TABLE_PAGE_SIZES.map((n) => (
          <DropdownMenuItem
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              'cursor-pointer rounded-md px-2 py-1.5 text-sm focus:bg-[#E8A020]/12 focus:text-[#E8A020] data-[highlighted]:bg-[#E8A020]/12 data-[highlighted]:text-[#E8A020]',
              n === value ? 'text-[#E8A020]' : 'text-foreground',
            )}
          >
            <span className="font-mono tabular-nums">{n.toString().padStart(3, ' ')}</span>
            <span className="ml-2">每頁</span>
            {n === value ? <span className="ml-auto text-[#E8A020]">✓</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
