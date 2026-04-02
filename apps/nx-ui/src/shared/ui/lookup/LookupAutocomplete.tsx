/**
 * File: apps/nx-ui/src/shared/ui/lookup/LookupAutocomplete.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-LOOKUP-AUTOCOMPLETE-001：通用 Lookup Autocomplete（下拉搜尋選取）
 *
 * Notes:
 * - 支援：debounce 放在外層 hook（本元件只負責 UI）
 * - 支援：click outside 自動關閉
 * - renderOption / getKey 由外部注入，避免綁死 DTO
 * - 選用：panelArrowNavigation（↑↓ Enter）、escapePanelOnlyFirst（Esc 先關面板）
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '@/shared/lib/cx';

export type LookupAutocompleteProps<T> = {
  value: string;
  onChange: (next: string) => void;

  options: T[];
  open: boolean;
  onOpenChange: (open: boolean) => void;

  loading?: boolean;
  disabled?: boolean;

  placeholder?: string;
  emptyText?: string;
  loadingText?: string;

  getKey: (row: T) => string;
  renderOption: (row: T) => React.ReactNode;
  onPick: (row: T) => void;

  className?: string;
  inputClassName?: string;
  panelClassName?: string;

  /** 轉發給底層 input（供外層 focus） */
  inputRef?: React.Ref<HTMLInputElement | null>;
  /** 下拉顯示且有多筆選項時：↑↓ 移動高亮、Enter 選取（無高亮則選第一筆） */
  panelArrowNavigation?: boolean;
  /** true：Esc 先僅關閉面板；面板已關時改呼叫 onEscapePanelAlreadyClosed（不預設清空） */
  escapePanelOnlyFirst?: boolean;
  onEscapePanelAlreadyClosed?: () => void;
  /** Enter 且輸入框為空字串時（不開下拉選人） */
  onEnterWhenEmptyQuery?: () => void;
};

/**
 * @FUNCTION_CODE NX00-UI-SHARED-LOOKUP-AUTOCOMPLETE-001-F01
 * 說明：
 * - LookupAutocomplete：通用搜尋下拉
 */
export function LookupAutocomplete<T>(props: LookupAutocompleteProps<T>) {
  const {
    value,
    onChange,
    options,
    open,
    onOpenChange,
    loading = false,
    disabled = false,
    placeholder = 'Search...',
    emptyText = '沒有符合的資料',
    loadingText = '搜尋中...',
    getKey,
    renderOption,
    onPick,
    className,
    inputClassName,
    panelClassName,
    inputRef: inputRefProp,
    panelArrowNavigation = false,
    escapePanelOnlyFirst = false,
    onEscapePanelAlreadyClosed,
    onEnterWhenEmptyQuery,
  } = props;

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const innerInputRef = useRef<HTMLInputElement | null>(null);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as any)) onOpenChange(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onOpenChange]);

  const showPanel = useMemo(
    () => open && (loading || options.length > 0 || value.trim().length > 0),
    [open, loading, options.length, value],
  );

  useEffect(() => {
    setHighlightIdx(-1);
  }, [options, open, value]);

  const setInputRef = (el: HTMLInputElement | null) => {
    innerInputRef.current = el;
    if (typeof inputRefProp === 'function') inputRefProp(el);
    else if (inputRefProp && 'current' in inputRefProp) (inputRefProp as React.MutableRefObject<HTMLInputElement | null>).current = el;
  };

  const pickAt = (idx: number) => {
    const row = options[idx];
    if (!row) return;
    onPick(row);
    onOpenChange(false);
    setHighlightIdx(-1);
  };

  return (
    <div ref={wrapRef} className={cx('relative', className)}>
      <input
        ref={setInputRef}
        className={cx(
          'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20 disabled:opacity-50',
          inputClassName,
        )}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (!disabled) onOpenChange(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (!value.trim()) {
              if (onEnterWhenEmptyQuery) {
                e.preventDefault();
                onEnterWhenEmptyQuery();
              }
              return;
            }
            if (showPanel && options.length > 0) {
              e.preventDefault();
              const idx =
                panelArrowNavigation && highlightIdx >= 0 ? highlightIdx : 0;
              pickAt(Math.min(options.length - 1, Math.max(0, idx)));
            }
            return;
          }

          if (e.key === 'Escape') {
            if (escapePanelOnlyFirst) {
              e.preventDefault();
              e.stopPropagation();
              if (showPanel) {
                onOpenChange(false);
                setHighlightIdx(-1);
              } else {
                onEscapePanelAlreadyClosed?.();
              }
              return;
            }
            onChange('');
            onOpenChange(false);
            setHighlightIdx(-1);
            return;
          }

          if (!panelArrowNavigation || !showPanel || options.length === 0) return;

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIdx((i) => {
              if (i < 0) return 0;
              return Math.min(options.length - 1, i + 1);
            });
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIdx((i) => {
              if (i <= 0) return 0;
              return i - 1;
            });
          }
        }}
      />

      {showPanel && (
        <div
          className={cx(
            'absolute left-0 top-[44px] z-30 w-full rounded-xl border border-white/10 bg-[#0b0f13]/95 p-2 shadow-xl backdrop-blur',
            panelClassName,
          )}
        >
          {loading && <div className="px-2 py-2 text-xs text-white/60">{loadingText}</div>}

          {!loading && options.length === 0 && <div className="px-2 py-2 text-xs text-white/60">{emptyText}</div>}

          {!loading &&
            options.map((row, idx) => (
              <button
                key={getKey(row)}
                type="button"
                className={cx(
                  'flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-white/85 hover:bg-white/10',
                  panelArrowNavigation && highlightIdx === idx && 'bg-white/15 ring-1 ring-primary/40',
                )}
                onMouseEnter={() => panelArrowNavigation && setHighlightIdx(idx)}
                onClick={() => {
                  pickAt(idx);
                }}
              >
                {renderOption(row)}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
