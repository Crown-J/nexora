// apps/nx-ui/src/design/components/quick-search/Combobox.tsx
// 通用 Combobox：input + 聯想下拉浮層（執行長 2026-06-17 拍板）
//
// 行為：
//   - 輸入 → debounce 200ms → fetchSuggestions(query) → 下拉開
//   - ↑↓：切下拉選中項（焦點留在 input、視覺高亮）
//   - Enter：
//       · 下拉有選中項 → onSelect(item) + 下拉關 + 觸發 onSubmit（跳下一欄）
//       · 下拉沒選中 → onSubmit（用輸入文字、跳下一欄/搜尋）
//   - Esc：下拉開著就只關下拉（不關 Modal）；下拉關著時冒泡讓外層處理
//   - IME composition 中所有 keydown 不處理
//   - blur：100ms 延遲關下拉（給 mousedown 選項的機會）
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@design/utils/cn';

export type ComboboxProps<T> = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;

  /** 抓聯想項；回空陣列 = 不顯示下拉 */
  fetchSuggestions: (query: string) => Promise<T[]>;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getDescription?: (item: T) => string | undefined;

  /** 選了一個聯想項（onChange 已被 caller 內部呼叫填入 input） */
  onSelect: (item: T) => void;

  /** Enter 在沒選聯想項時觸發（parent 通常會 focusNext or runSearch）*/
  onSubmit: () => void;

  /** debounce ms、預設 200 */
  debounceMs?: number;
};

export function Combobox<T>({
  label,
  value,
  onChange,
  placeholder,
  inputRef,
  fetchSuggestions,
  getKey,
  getLabel,
  getDescription,
  onSelect,
  onSubmit,
  debounceMs = 200,
}: ComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<T[]>([]);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [searchedEmpty, setSearchedEmpty] = useState(false);
  const reqIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  // 選定聯想項後 set true、下次 value 變化的 useEffect 跳過 fetch（避免下拉重新打開）
  const justSelectedRef = useRef(false);

  // debounce fetch suggestions（清空 state 統一在 handleChange 內處理、effect 不直接 setState）
  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    const q = value.trim();
    if (!q) return;
    const myReqId = ++reqIdRef.current;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const items = await fetchSuggestions(q);
          if (reqIdRef.current !== myReqId) return; // 過期請求丟掉
          setSuggestions(items);
          setFocusedIdx(items.length > 0 ? 0 : -1);
          setSearchedEmpty(items.length === 0);
          setOpen(true); // 永遠開（有結果就顯示項目；無結果顯示「無聯想項」提示）
        } catch {
          if (reqIdRef.current !== myReqId) return;
          setSuggestions([]);
          setSearchedEmpty(true);
          setOpen(true);
        }
      })();
    }, debounceMs);
    return () => clearTimeout(t);
  }, [value, fetchSuggestions, debounceMs]);

  // value 清空時同步關下拉（包進 handler 避免 effect 內 setState 警告）
  const handleChange = useCallback(
    (next: string) => {
      onChange(next);
      if (!next.trim()) {
        setSuggestions([]);
        setOpen(false);
        setFocusedIdx(-1);
        setSearchedEmpty(false);
      }
    },
    [onChange],
  );

  // 選定聯想項共用 helper（鍵盤 Enter 與 click 都走這）
  const handleSelect = useCallback(
    (item: T) => {
      justSelectedRef.current = true;
      setOpen(false);
      setSuggestions([]);
      setFocusedIdx(-1);
      setSearchedEmpty(false);
      onSelect(item);
      onSubmit();
    },
    [onSelect, onSubmit],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) return; // IME 中不處理

      if (e.key === 'ArrowDown') {
        if (suggestions.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
        setFocusedIdx((i) => Math.min(suggestions.length - 1, i + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        if (suggestions.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        setFocusedIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        // 有下拉開且有 focused suggestion → 選定（走 handleSelect 含 justSelectedRef 保護）
        if (open && focusedIdx >= 0 && suggestions[focusedIdx]) {
          handleSelect(suggestions[focusedIdx]);
        } else {
          // 沒選下拉、直接用輸入文字
          setOpen(false);
          onSubmit();
        }
        return;
      }
      if (e.key === 'Escape') {
        // 下拉開著就只關下拉、不冒泡讓 Modal 關閉
        if (open) {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
        }
        return;
      }
      if (e.key === 'Tab') {
        setOpen(false);
        // 不 preventDefault、讓 native tab 跳下一欄
        return;
      }
    },
    [open, suggestions, focusedIdx, handleSelect, onSubmit],
  );

  // 點外面關下拉
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // 切焦點時 scroll into view
  useEffect(() => {
    if (focusedIdx < 0) return;
    containerRef.current
      ?.querySelector(`[data-cbo-idx="${focusedIdx}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [focusedIdx]);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">{label}</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="h-8 rounded-md border border-border/40 bg-background/60 px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-[#E8A020]/60"
      />

      {open && suggestions.length > 0 ? (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border border-border/40 bg-card/60 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          {suggestions.map((item, i) => {
            const desc = getDescription?.(item);
            return (
              <li key={getKey(item)}>
                <button
                  type="button"
                  data-cbo-idx={i}
                  onMouseEnter={() => setFocusedIdx(i)}
                  onMouseDown={(e) => {
                    // 防 input blur 比點擊先發生（會讓下拉關掉而錯過 click）
                    e.preventDefault();
                  }}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'flex w-full flex-col items-start gap-0.5 px-3 py-1.5 text-left text-xs',
                    i === focusedIdx
                      ? 'bg-[#E8A020]/15 text-[#E8A020]'
                      : 'text-foreground hover:bg-card/60',
                  )}
                >
                  <span className="truncate font-mono">{getLabel(item)}</span>
                  {desc ? (
                    <span className="truncate text-[10px] text-muted-foreground/70">{desc}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : open && searchedEmpty ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-border/40 bg-card/60 px-3 py-2 text-[11px] text-muted-foreground/70 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          無聯想項（按 Enter 用輸入文字搜尋、或檢查是否已 seed 測試資料）
        </div>
      ) : null}
    </div>
  );
}
