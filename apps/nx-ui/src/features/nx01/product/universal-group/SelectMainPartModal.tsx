// apps/nx-ui/src/features/nx01/product/universal-group/SelectMainPartModal.tsx
// 新建通用件群組 — 「先選主件 → 自動建群組」modal
//
// 範式：單選 modal（vs EntityPickerDialog 多選）。執行長拍板：
//   - 群組標題 = 主件、不另取名
//   - 主件 unique（新建時可選的 parts 已過濾掉所有現有群組的主件）
//
// 設計範式：父層 conditional mount（{open && <Modal />}）、modal 內 state
// 每次 mount 自然 reset、不需要 reset effect、避免 set-state-in-effect lint warning。
//
// 鍵盤：Alt+F 開搜尋、↑↓ 走、Space/Enter 選、Esc 關
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Check, Search } from 'lucide-react';

import { cn } from '@design/utils/cn';

import type { PartMock } from './mock-data';

export type SelectMainPartModalProps = {
  onClose: () => void;
  availableParts: PartMock[];
  onConfirm: (part: PartMock) => void;
};

export function SelectMainPartModal({
  onClose,
  availableParts,
  onConfirm,
}: SelectMainPartModalProps) {
  const [keyword, setKeyword] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return availableParts;
    return availableParts.filter(
      (p) => p.code.toLowerCase().includes(q) || p.name.includes(keyword),
    );
  }, [availableParts, keyword]);

  const handleKeywordChange = useCallback((value: string) => {
    setKeyword(value);
    setFocusedIdx(0); // 在 onChange 重置、避免 useEffect 內 setState
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedCode) return;
    const part = availableParts.find((p) => p.code === selectedCode);
    if (part) onConfirm(part);
  }, [availableParts, onConfirm, selectedCode]);

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
          setFocusedIdx(0);
          (document.activeElement as HTMLElement | null)?.blur();
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        const n = filtered.length;
        if (!n) return;
        setFocusedIdx((i) => (e.key === 'ArrowDown' ? Math.min(n - 1, i + 1) : Math.max(0, i - 1)));
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        if (tag === 'input') return;
        e.preventDefault();
        e.stopPropagation();
        const it = filtered[focusedIdx];
        if (it) setSelectedCode(it.code);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (selectedCode) handleSubmit();
        else {
          const it = filtered[focusedIdx];
          if (it) setSelectedCode(it.code);
        }
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [searchOpen, filtered, focusedIdx, selectedCode, handleSubmit, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-xl flex-col rounded-2xl border border-[#2A2A30] bg-[#131316] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-[#2A2A30] px-5 py-3">
          <span className="size-2 rounded-full bg-[#E8A020] shadow-[0_0_10px_#E8A020]" />
          <Box className="size-4 text-[#E8A020]" />
          <h2 className="text-sm font-bold tracking-wide text-[#F0F0F3]">新增通用件群組</h2>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A60]">
            Select Main Part
          </span>
        </div>

        {/* Subtitle hint */}
        <div className="border-b border-[#2A2A30] px-5 py-2 text-xs text-[#888892]">
          先選主件、群組將以主件命名（料號＋品名）。已是其他群組主件的零件不會出現。
        </div>

        {/* Search */}
        {searchOpen ? (
          <div className="flex items-center gap-2 border-b border-[#2A2A30] px-4 py-2">
            <Search className="size-4 text-[#E8A020]" />
            <input
              ref={searchInputRef}
              type="text"
              value={keyword}
              onChange={(e) => handleKeywordChange(e.target.value)}
              placeholder="搜尋料號或品名…"
              className="flex-1 bg-transparent text-sm text-[#E8E8EB] outline-none placeholder:text-[#5A5A60]"
            />
            <span className="hidden text-[10px] tracking-wider text-[#5A5A60] sm:inline">ESC 關閉</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-b border-[#2A2A30] px-4 py-1.5 text-[11px] text-[#5A5A60]">
            <Search className="size-3.5" />
            ↑↓ 選 · 空白 標記 · Alt+F 搜尋 · Enter 建立
          </div>
        )}

        {/* List */}
        <div className="min-h-0 flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-[#5A5A60]">
              {keyword
                ? `找不到符合「${keyword}」的零件`
                : '所有零件都已是其他群組的主件、請先到群組裡換主件'}
            </div>
          ) : (
            <ul className="divide-y divide-[#1A1A1F]">
              {filtered.map((p, index) => {
                const isSelected = selectedCode === p.code;
                const isFocused = index === focusedIdx;
                return (
                  <li key={p.code}>
                    <button
                      type="button"
                      onClick={() => setSelectedCode(p.code)}
                      onMouseEnter={() => setFocusedIdx(index)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        isFocused && 'ring-1 ring-inset ring-[#E8A020]/60',
                        isSelected ? 'bg-[#E8A020]/12 hover:bg-[#E8A020]/16' : 'hover:bg-[#1A1A22]',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                          isSelected
                            ? 'border-[#E8A020]/60 bg-[#E8A020]/20 text-[#E8A020]'
                            : 'border-[#3A3A42] bg-[#1A1A1F]',
                        )}
                      >
                        {isSelected ? <Check className="size-3" /> : null}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span
                          className={cn(
                            'truncate text-sm',
                            isSelected ? 'font-semibold text-[#E8A020]' : 'text-[#E8E8EB]',
                          )}
                        >
                          {p.code} · {p.name}
                        </span>
                        <span className="truncate text-[11px] text-[#5A5A60]">
                          {p.brand} · {p.origin}
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
        <div className="flex items-center justify-between border-t border-[#2A2A30] bg-[#0A0A0C]/40 px-5 py-3">
          <span className="text-[10px] text-[#5A5A60]">
            ESC 取消 · 已選 <span className="font-mono text-[#E8A020]">{selectedCode ? 1 : 0}</span> 顆
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center rounded-md border border-[#2A2A30] bg-[#1A1A1F] px-3 text-xs font-medium text-[#B8B8C0] transition-colors hover:border-[#3A3A42] hover:bg-[#22222A] hover:text-[#E8E8EB]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedCode}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/15 px-3 text-xs font-medium text-[#E8A020] transition-colors',
                !selectedCode ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#E8A020]/25',
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
