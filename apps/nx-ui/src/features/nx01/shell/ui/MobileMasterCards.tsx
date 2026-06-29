// apps/nx-ui/src/features/nx01/shell/ui/MobileMasterCards.tsx
// 手機版主檔列表：把 MasterTable 的列轉成卡片（主欄粗體 + 次兩欄 + 停用徽章 + chevron）。
// 點卡片 = onOpenDetail(id)。桌面用 MasterTable、手機用此元件（md:hidden）。
'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@design/utils/cn';
import type { MasterTableColumn } from './MasterTable';

export function MobileMasterCards<T>({
  rows,
  columns,
  getRowId,
  selectedId,
  onOpenDetail,
  loading,
  isInactive,
}: {
  rows: T[];
  columns: MasterTableColumn<T>[];
  getRowId: (r: T) => string;
  selectedId?: string | null;
  onOpenDetail: (id: string) => void;
  loading?: boolean;
  /** 判斷該列是否停用（顯示「停用」徽章）；未提供時讀 row.isActive===false */
  isInactive?: (r: T) => boolean;
}) {
  if (!rows.length) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">{loading ? '載入中…' : '尚無資料'}</div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 pb-24">
      {rows.map((r, i) => {
        const id = getRowId(r);
        const inactive = isInactive ? isInactive(r) : (r as { isActive?: boolean }).isActive === false;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onOpenDetail(id)}
            className={cn(
              'flex items-center gap-3 rounded-lg border bg-card px-3 py-3 text-left active:bg-accent/15',
              selectedId === id ? 'border-primary/50' : 'border-border/60',
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="min-w-0 truncate text-[15px] font-medium text-foreground">
                  {columns[0]?.render(r, i)}
                </span>
                {inactive ? (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground">停用</span>
                ) : null}
              </div>
              {columns.slice(1, 3).map((c) => (
                <div key={c.key} className="mt-0.5 flex gap-1 truncate text-[12px] text-muted-foreground">
                  <span className="shrink-0 text-muted-foreground/70">{c.label}：</span>
                  <span className="min-w-0 truncate">{c.render(r, i)}</span>
                </div>
              ))}
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        );
      })}
    </div>
  );
}
