// apps/nx-ui/src/features/nx01/shell/ui/sort-config/SortConfigDialog.tsx
// 2026-06-18 M 排序設定 dialog（執行長範式）
//   - 單欄位排序（後續可擴多欄位）
//   - asc / desc 切換
//   - 還原預設（清排序、回序號 A-Z）
//   - ESC 關閉
'use client';

import { useEffect } from 'react';
import { ArrowDownAZ, ArrowDownZA, ArrowUpDown, RotateCcw, X } from 'lucide-react';

import { cn } from '@design/utils/cn';

export type SortableOption = {
  key: string;
  label: string;
};

export type SortOrder = 'asc' | 'desc';

export function SortConfigDialog({
  open,
  onClose,
  options,
  sortKey,
  sortOrder,
  onChange,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  /** 可排序欄位 metadata（順序 = dropdown 顯示順序） */
  options: SortableOption[];
  /** 當前排序欄位 key、null = 預設（序號 A-Z） */
  sortKey: string | null;
  sortOrder: SortOrder;
  /** 套用變動（key=null → 清排序 = 還原預設） */
  onChange: (key: string | null, order: SortOrder) => void;
  /** 還原預設（= onChange(null, 'asc')） */
  onReset: () => void;
}) {
  // ESC 關閉
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleReset = () => {
    onReset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/40 bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border/40 px-5 py-3">
          <ArrowUpDown className="size-4 text-[#E8A020]" />
          <h2 className="text-sm font-bold tracking-wide text-foreground">排序設定</h2>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
            Sort
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="rounded p-1 text-muted-foreground hover:bg-accent/30 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-3 text-[12.5px]">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            選擇排序欄位 · 點欄位切 A-Z／Z-A
          </div>
          <div className="flex flex-col gap-[3px]">
            {options.map((opt) => {
              const active = opt.key === sortKey;
              const Icon = active && sortOrder === 'desc' ? ArrowDownZA : ArrowDownAZ;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    if (active) {
                      // 已選中、切方向
                      onChange(opt.key, sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      onChange(opt.key, 'asc');
                    }
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition-colors',
                    active
                      ? 'border-[#E8A020]/50 bg-[#E8A020]/12 text-[#E8A020]'
                      : 'border-border/40 bg-background/40 text-foreground hover:border-[#E8A020]/40 hover:bg-[#E8A020]/10',
                  )}
                >
                  <span className="flex-1">{opt.label}</span>
                  {active ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono">
                      <Icon className="size-3.5" />
                      {sortOrder === 'asc' ? 'A → Z' : 'Z → A'}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/60">點擊套用</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/40 bg-card/60 px-5 py-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/40 bg-background/40 px-3 text-xs font-medium text-muted-foreground hover:border-[#E8A020]/40 hover:bg-[#E8A020]/10 hover:text-[#E8A020]"
          >
            <RotateCcw className="size-3" />
            還原預設（序號 A-Z）
          </button>
          <span className="text-[10px] text-muted-foreground/70">ESC 關閉 · 變動即時套用</span>
        </div>
      </div>
    </div>
  );
}
