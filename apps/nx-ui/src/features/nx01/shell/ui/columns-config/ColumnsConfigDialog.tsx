// apps/nx-ui/src/features/nx01/shell/ui/columns-config/ColumnsConfigDialog.tsx
// 2026-06-18 I 欄位設定 dialog
//   - 列出所有欄位、可勾選顯/隱、上下調順序
//   - 還原預設按鈕（清 localStorage + 回 default）
//   - ESC 關閉、套用即時生效（不需另按存檔）
'use client';

import { useEffect, useMemo } from 'react';
import { ArrowDown, ArrowUp, Columns3, RotateCcw, X } from 'lucide-react';

import { cn } from '@design/utils/cn';

export type ColumnsConfigOption = {
  key: string;
  label: string;
};

export function ColumnsConfigDialog({
  open,
  onClose,
  allColumns,
  visibleKeys,
  onChange,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  /** 全欄位 metadata（含順序 = default 順序） */
  allColumns: ColumnsConfigOption[];
  /** 當前顯示中的 keys（含順序） */
  visibleKeys: string[];
  /** 套用變動（顯示 / 排序）→ caller 寫 localStorage */
  onChange: (next: string[]) => void;
  /** 還原預設 */
  onReset: () => void;
}) {
  // 2026-06-18 執行長範式:變動即時套用、不需 visibleKeys 暫存（直接用 visibleKeys 為 source of truth）

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

  // 顯示給 user 的列表：可見 + 隱藏（可見區可排序、隱藏區灰色）
  const ordered = useMemo(() => {
    const visibleSet = new Set(visibleKeys);
    const visibleList = visibleKeys
      .map((k) => allColumns.find((c) => c.key === k))
      .filter((c): c is ColumnsConfigOption => !!c);
    const hiddenList = allColumns.filter((c) => !visibleSet.has(c.key));
    return { visibleList, hiddenList };
  }, [visibleKeys, allColumns]);

  if (!open) return null;

  const toggle = (key: string) => {
    if (visibleKeys.includes(key)) {
      onChange(visibleKeys.filter((k) => k !== key));
    } else {
      onChange([...visibleKeys, key]);
    }
  };

  const move = (key: string, dir: -1 | 1) => {
    const idx = visibleKeys.indexOf(key);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= visibleKeys.length) return;
    const next = [...visibleKeys];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

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
          <Columns3 className="size-4 text-[#E8A020]" />
          <h2 className="text-sm font-bold tracking-wide text-foreground">欄位設定</h2>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
            Columns
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
          {/* 顯示中 */}
          <div className="mb-3">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              顯示中 · 拖動順序由按鈕調整
            </div>
            {ordered.visibleList.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/40 px-3 py-3 text-center text-[11px] text-muted-foreground">
                目前沒有顯示欄位、請從下方加入
              </div>
            ) : (
              <div className="flex flex-col gap-[3px]">
                {ordered.visibleList.map((c, i) => (
                  <div
                    key={c.key}
                    className="flex items-center gap-2 rounded-md border border-border/40 bg-background/40 px-2.5 py-1.5"
                  >
                    <input
                      type="checkbox"
                      checked
                      onChange={() => toggle(c.key)}
                      className="size-3.5 accent-[#E8A020]"
                    />
                    <span className="flex-1 text-foreground">{c.label}</span>
                    <button
                      type="button"
                      onClick={() => move(c.key, -1)}
                      disabled={i === 0}
                      aria-label="上移"
                      className={cn(
                        'inline-flex size-6 items-center justify-center rounded border',
                        i === 0
                          ? 'cursor-not-allowed border-border/20 text-muted-foreground/30'
                          : 'border-border/40 text-muted-foreground hover:border-[#E8A020]/40 hover:text-[#E8A020]',
                      )}
                    >
                      <ArrowUp className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(c.key, 1)}
                      disabled={i === ordered.visibleList.length - 1}
                      aria-label="下移"
                      className={cn(
                        'inline-flex size-6 items-center justify-center rounded border',
                        i === ordered.visibleList.length - 1
                          ? 'cursor-not-allowed border-border/20 text-muted-foreground/30'
                          : 'border-border/40 text-muted-foreground hover:border-[#E8A020]/40 hover:text-[#E8A020]',
                      )}
                    >
                      <ArrowDown className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 隱藏中 */}
          {ordered.hiddenList.length > 0 ? (
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                隱藏中 · 勾選加回
              </div>
              <div className="flex flex-col gap-[3px]">
                {ordered.hiddenList.map((c) => (
                  <div
                    key={c.key}
                    className="flex items-center gap-2 rounded-md border border-border/30 bg-background/20 px-2.5 py-1.5"
                  >
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => toggle(c.key)}
                      className="size-3.5 accent-[#E8A020]"
                    />
                    <span className="flex-1 text-muted-foreground">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/40 bg-card/60 px-5 py-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/40 bg-background/40 px-3 text-xs font-medium text-muted-foreground hover:border-[#E8A020]/40 hover:bg-[#E8A020]/10 hover:text-[#E8A020]"
          >
            <RotateCcw className="size-3" />
            還原預設
          </button>
          <span className="text-[10px] text-muted-foreground/70">ESC 關閉 · 變動即時套用</span>
        </div>
      </div>
    </div>
  );
}
