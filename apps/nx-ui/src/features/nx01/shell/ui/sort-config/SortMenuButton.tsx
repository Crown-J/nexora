// apps/nx-ui/src/features/nx01/shell/ui/sort-config/SortMenuButton.tsx
// 2026-06-18 M 排序 dropdown menu（執行長範式 v2，取代 dialog）
//   - 跟 O 匯出同範式：受控 dropdown、Alt+M 程式打開、ESC 關回 focus row
//   - 每個欄位點一下 / Enter 循環三態：無排序 → A-Z → Z-A → 無排序
//   - 單欄位排序：點別欄位自動切過去（前一欄位回無）
//   - 底部還原預設按鈕（一鍵清排序）
'use client';

import { ArrowDownAZ, ArrowDownZA, ArrowUpDown, RotateCcw } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@design/primitives/dropdown-menu';
import { cn } from '@design/utils/cn';

export type SortableOption = {
  key: string;
  label: string;
};

export type SortOrder = 'asc' | 'desc';

export function SortMenuButton({
  options,
  sortKey,
  sortOrder,
  onChange,
  onReset,
  open,
  onOpenChange,
  onCloseAutoFocus,
}: {
  /** 可排序欄位 metadata（順序 = dropdown 顯示順序） */
  options: SortableOption[];
  /** 當前排序欄位 key、null = 預設（無排序、後端 fallback 序號 A-Z） */
  sortKey: string | null;
  sortOrder: SortOrder;
  /** 套用變動（key=null → 清排序 = 還原預設） */
  onChange: (key: string | null, order: SortOrder) => void;
  /** 還原預設（= onChange(null, 'asc')） */
  onReset: () => void;
  /** 受控 open（Alt+M 程式觸發） */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Radix 關閉時 focus restore hook（preventDefault + 手動 focus row）*/
  onCloseAutoFocus?: (e: Event) => void;
}) {
  const cycleSort = (key: string) => {
    if (key !== sortKey) {
      onChange(key, 'asc');
      return;
    }
    if (sortOrder === 'asc') {
      onChange(key, 'desc');
      return;
    }
    onChange(null, 'asc');
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="排序（M）"
          aria-pressed={sortKey != null}
          className={cn(
            'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-all',
            sortKey
              ? 'border-primary/50 bg-primary/15 text-primary hover:bg-primary/25'
              : 'border-border/50 bg-card text-foreground/80 hover:border-border hover:bg-accent/15 hover:text-foreground',
            'data-[state=open]:border-primary/50 data-[state=open]:bg-primary/15 data-[state=open]:text-primary',
          )}
        >
          <ArrowUpDown className="size-3" />
          <span className="hidden sm:inline">
            <span className={cn('mr-0.5 font-mono', sortKey ? '' : 'text-primary')}>M</span>
            {sortKey ? '排序·1' : '排序'}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        onCloseAutoFocus={onCloseAutoFocus}
        className="min-w-[14rem] border-border/40 bg-popover/95 p-1 shadow-2xl backdrop-blur-xl"
      >
        {options.map((opt) => {
          const active = opt.key === sortKey;
          const Icon = active && sortOrder === 'desc' ? ArrowDownZA : active ? ArrowDownAZ : null;
          return (
            <DropdownMenuItem
              key={opt.key}
              onSelect={(e) => {
                // preventDefault 讓 dropdown 不關閉、user 可連續操作
                e.preventDefault();
                cycleSort(opt.key);
              }}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm focus:bg-primary/15 focus:text-primary data-[highlighted]:bg-primary/15 data-[highlighted]:text-primary',
                active ? 'text-primary' : 'text-foreground',
              )}
            >
              <span className="flex-1">{opt.label}</span>
              {Icon ? (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-mono">
                  <Icon className="size-3" />
                  {sortOrder === 'asc' ? 'A → Z' : 'Z → A'}
                </span>
              ) : (
                <span className="text-[10.5px] text-muted-foreground/50">無</span>
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator className="my-1 bg-border/40" />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onReset();
          }}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground focus:bg-primary/15 focus:text-primary data-[highlighted]:bg-primary/15 data-[highlighted]:text-primary"
        >
          <RotateCcw className="size-3" />
          還原預設（序號 A-Z）
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
