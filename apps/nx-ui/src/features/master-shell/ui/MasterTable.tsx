// apps/nx-ui/src/features/master-shell/ui/MasterTable.tsx
/**
 * NEXORA Master Shell — MasterTable（泛型主檔列表）
 *
 * 抽自 lab/users（commit 41-48）UsersTable，泛型化以套用所有主檔。
 *
 * 設計：
 * - 泛型欄位配置（MasterTableColumn<T>）：每個 column 自訂 render(row, index)
 * - 第一欄自動處理：瀏覽模式 → 序號（0001/0002 4 位零填）；選取模式 → checkbox
 * - zebra 條紋（偶數列 #101015 微亮階）+ hover #1A1A22
 * - 選列琥珀漸層 + 3px 左條 + inset ring
 * - 鍵盤導航（focus row 後 ↑↓ 切列、Enter 進編輯 = onOpenDetail）
 * - placeholder rows 填滿 pageSize（預設 20），條紋連續
 * - sticky thead（金屬 gradient + inset top highlight）+ 排序按鈕
 * - footer：count + hint + 每頁筆數
 */
'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  sortKey,
  onSortKeyChange,
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
  sortKey?: string;
  onSortKeyChange?: (key: string) => void;
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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto nx-master-scroll" onKeyDown={handleTableKey}>
        <table className="w-full border-collapse text-sm">
          <thead
            className="sticky top-0 z-10 backdrop-blur-xl"
            style={{
              backgroundImage:
                'linear-gradient(180deg, rgba(20,20,26,0.95) 0%, rgba(16,16,20,0.95) 100%)',
              boxShadow:
                'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 #000000',
            }}
          >
            <tr className="border-b border-[#2A2A30] text-left text-[11px] font-bold uppercase tracking-[0.16em] text-[#C8C8D0]">
              <th className="w-12 px-2 py-2.5">
                {selectionMode ? (
                  <input
                    type="checkbox"
                    checked={checked.size === rows.length && rows.length > 0}
                    onChange={toggleAll}
                    className="size-3.5 rounded border-[#3A3A42] bg-[#1A1A1F] accent-[#E8A020]"
                    aria-label="全選"
                  />
                ) : (
                  <span className="font-medium">序號</span>
                )}
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn('whitespace-nowrap px-2 py-2.5', col.minWidthClass)}
                >
                  {col.sortable && onSortKeyChange ? (
                    <button
                      type="button"
                      onClick={() => onSortKeyChange(col.key)}
                      className="inline-flex items-center gap-1 transition-colors hover:text-[#F0F0F3]"
                    >
                      {col.label}
                      <ChevronDown className={cn('size-3', sortKey === col.key && 'text-[#E8A020]')} />
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
                  style={
                    isSelected
                      ? {
                          backgroundImage:
                            'linear-gradient(90deg, rgba(232,160,32,0.18) 0%, rgba(232,160,32,0.08) 100%)',
                          boxShadow:
                            'inset 0 0 0 1px rgba(232,160,32,0.45), inset 3px 0 0 0 #E8A020',
                        }
                      : undefined
                  }
                  className={cn(
                    'cursor-pointer border-b border-[#1A1A1F]/70 transition-all outline-none',
                    'focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#E8A020]/60',
                    !isSelected &&
                      (selectionMode && isChecked
                        ? 'bg-[#E8A020]/6'
                        : cn(isEvenRow ? 'bg-[#101015]' : 'bg-transparent', 'hover:bg-[#1A1A22]')),
                  )}
                >
                  <td className="px-2 py-2.5" onClick={(e) => selectionMode && e.stopPropagation()}>
                    {selectionMode ? (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRow(id)}
                        className="size-3.5 rounded border-[#3A3A42] bg-[#1A1A1F] accent-[#E8A020]"
                        aria-label={`選取 ${id}`}
                      />
                    ) : (
                      <span className="font-mono text-[11px] tabular-nums text-[#5A5A60]">
                        {String(i + 1).padStart(4, '0')}
                      </span>
                    )}
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className="px-2 py-2.5">
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
                    'pointer-events-none select-none border-b border-[#1A1A1F]/40',
                    isEvenRow && 'bg-[#101015]',
                  )}
                >
                  <td className="px-2 py-2.5">&nbsp;</td>
                  {columns.map((col) => (
                    <td key={col.key} className="px-2 py-2.5">&nbsp;</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        className="flex items-center justify-between border-t border-[#2A2A30] px-6 py-2 text-[11px] text-[#888892]"
        style={{
          backgroundImage: 'linear-gradient(180deg, #101014 0%, #0A0A0C 100%)',
          boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)',
        }}
      >
        <span>
          共 {total} 筆 · 顯示 {rows.length} 筆{footerHint ? ` · ${footerHint}` : ''}
        </span>
        <span className="text-[#5A5A60]">每頁 {pageSize} 筆</span>
      </div>
    </div>
  );
}
