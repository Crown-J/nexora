// apps/nx-ui/src/features/nx01/product/universal-group/SelectMainPartModal.tsx
// 新建通用件群組 — 「先選主件 → 自動建群組」modal
// 2026-06-22 改：接真 API（listParts）+ debounced async search、不再用 mock-data
//
// 範式：單選 modal（vs EntityPickerDialog 多選）。執行長拍板：
//   - 群組標題 = 主件、不另取名
//   - 主件 unique（excludePartIds 為已是其他群組主件的內碼集合、modal 內過濾）
//
// 鍵盤：Alt+F 開搜尋、↑↓ 走、Space/Enter 選、Esc 關
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Check, Loader2, Search } from 'lucide-react';

import { cn } from '@design/utils/cn';
import { useModalLayer } from '@design/primitives/modal-stack';
import { listParts, type PartDto } from '@data/endpoints/nx01/api/part';

export type SelectMainPartModalProps = {
  onClose: () => void;
  /** 已是其他群組主件的 partId 集合、modal 內過濾 */
  excludePartIds: Set<string>;
  onConfirm: (part: PartDto) => void;
};

export function SelectMainPartModal({
  onClose,
  excludePartIds,
  onConfirm,
}: SelectMainPartModalProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  useModalLayer(layerRef, onClose);
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<PartDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // debounced fetch
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await listParts({ q: keyword.trim() || undefined, pageSize: 50, isActive: true });
        if (cancelled) return;
        const filtered = res.items.filter((p) => !excludePartIds.has(p.id));
        setItems(filtered);
        setFocusedIdx(0);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [keyword, excludePartIds]);

  const handleSubmit = useCallback(() => {
    if (!selectedId) return;
    const part = items.find((p) => p.id === selectedId);
    if (part) onConfirm(part);
  }, [items, onConfirm, selectedId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        e.stopPropagation();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (searchOpen) {
          setSearchOpen(false);
          setKeyword('');
          (document.activeElement as HTMLElement | null)?.blur();
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        const n = items.length;
        if (!n) return;
        setFocusedIdx((i) => (e.key === 'ArrowDown' ? Math.min(n - 1, i + 1) : Math.max(0, i - 1)));
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        if (tag === 'input') return;
        e.preventDefault();
        e.stopPropagation();
        const it = items[focusedIdx];
        if (it) setSelectedId(it.id);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (selectedId) handleSubmit();
        else {
          const it = items[focusedIdx];
          if (it) setSelectedId(it.id);
        }
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [searchOpen, items, focusedIdx, selectedId, handleSubmit, onClose]);

  return (
    <div
      ref={layerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-xl flex-col rounded-2xl border border-border/40 bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border/40 px-5 py-3">
          <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
          <Box className="size-4 text-primary" />
          <h2 className="text-sm font-bold tracking-wide text-foreground">新增通用件群組</h2>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Select Main Part
          </span>
        </div>

        {/* Subtitle hint */}
        <div className="border-b border-border/40 px-5 py-2 text-xs text-muted-foreground">
          先選主件、群組將以主件命名（料號＋品名）。已是其他群組主件的零件不會出現。
        </div>

        {/* Search */}
        {searchOpen ? (
          <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2">
            <Search className="size-4 text-primary" />
            <input
              ref={searchInputRef}
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜尋料號或品名…"
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {loading ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
            <span className="hidden text-[10px] tracking-wider text-muted-foreground sm:inline">ESC 關閉</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-b border-border/40 px-4 py-1.5 text-[11px] text-muted-foreground">
            <Search className="size-3.5" />
            ↑↓ 選 · 空白 標記 · Alt+F 搜尋 · Enter 建立
            {loading ? <Loader2 className="ml-auto size-3 animate-spin" /> : null}
          </div>
        )}

        {/* List */}
        <div className="min-h-0 flex-1 overflow-auto">
          {items.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-muted-foreground">
              {loading
                ? '載入中…'
                : keyword
                ? `找不到符合「${keyword}」的零件`
                : '輸入料號或品名搜尋（Alt+F）'}
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {items.map((p, index) => {
                const isSelected = selectedId === p.id;
                const isFocused = index === focusedIdx;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      onMouseEnter={() => setFocusedIdx(index)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        isFocused && 'ring-1 ring-inset ring-primary/60',
                        isSelected ? 'bg-primary/12 hover:bg-primary/16' : 'hover:bg-accent/15',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                          isSelected
                            ? 'border-primary/60 bg-primary/20 text-primary'
                            : 'border-border bg-muted',
                        )}
                      >
                        {isSelected ? <Check className="size-3" /> : null}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span
                          className={cn(
                            'truncate text-sm',
                            isSelected ? 'font-semibold text-primary' : 'text-foreground',
                          )}
                        >
                          {p.code} · {p.name}
                        </span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {p.partBrandCode ?? '—'} · {p.countryCode ?? '—'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-border/40 bg-muted/30 px-5 py-3">
          <span className="text-[10px] text-muted-foreground">
            ESC 取消 · 已選 <span className="font-mono text-primary">{selectedId ? 1 : 0}</span> 顆
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center rounded-md border border-border/40 bg-muted px-3 text-xs font-medium text-foreground/80 transition-colors hover:border-border hover:bg-accent/20 hover:text-foreground"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedId}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/15 px-3 text-xs font-medium text-primary transition-colors',
                !selectedId ? 'cursor-not-allowed opacity-50' : 'hover:bg-primary/25',
              )}
            >
              建立群組
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
