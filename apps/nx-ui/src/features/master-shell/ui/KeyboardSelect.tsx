// apps/nx-ui/src/features/master-shell/ui/KeyboardSelect.tsx
/**
 * KeyboardSelect — 全鍵盤下拉欄位（取代 native <select>，對齊 NEXORA 下拉操作規格）
 *
 * 業務員 muscle memory：
 *   · 收合時 Enter / 空白 / ↑↓ → 展開下拉
 *   · 展開時 ↑↓ → 移動選項、Enter → 確認選擇並跳下一格、Esc → 關閉不選
 *   · Tab → 關閉並交給瀏覽器跳焦點；點擊空白處 / blur → 關閉
 *
 * 與 EntityMasterPage 詳細頁「Enter 跳格鏈」整合：
 *   trigger 以 [data-kbd-select] 標記、納入跳格鏈；確認後自動 focus 表單內下一個可聚焦元素。
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@design/utils/cn';

export type KeyboardSelectOption = { value: string; label: string };

export function KeyboardSelect({
  value,
  options,
  placeholder = '請選擇...',
  disabled,
  ariaLabel,
  onChange,
}: {
  value: string;
  options: KeyboardSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedIdx = options.findIndex((o) => o.value === value);
  const selectedLabel = selectedIdx >= 0 ? options[selectedIdx].label : '';

  // 確認後跳到表單內下一個可聚焦欄位（含其他 KeyboardSelect）；無下一個則 blur。
  const advance = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const form = btn.closest('[data-master-form]') ?? document;
    const els = Array.from(
      form.querySelectorAll<HTMLElement>('input, select, textarea, [data-kbd-select]'),
    ).filter((el) => !(el as HTMLInputElement).disabled && el.offsetParent !== null);
    const idx = els.indexOf(btn);
    if (idx >= 0 && idx < els.length - 1) els[idx + 1]?.focus();
    else btn.blur();
  }, []);

  const openMenu = useCallback(() => {
    setHighlight(selectedIdx >= 0 ? selectedIdx : 0);
    setOpen(true);
  }, [selectedIdx]);

  const confirm = useCallback(
    (idx: number) => {
      const opt = options[idx];
      if (opt) onChange(opt.value);
      setOpen(false);
    },
    [options, onChange],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (!open) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          openMenu();
        }
        return;
      }
      // open
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setHighlight((i) =>
          e.key === 'ArrowDown' ? Math.min(options.length - 1, i + 1) : Math.max(0, i - 1),
        );
      } else if (e.key === 'Home') {
        e.preventDefault();
        e.stopPropagation();
        setHighlight(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        e.stopPropagation();
        setHighlight(options.length - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        confirm(highlight);
        // 確認後跳下一格（等選單關閉、focus 回 trigger 後再前進）
        setTimeout(advance, 0);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      } else if (e.key === 'Tab') {
        setOpen(false); // 不 preventDefault，讓 Tab 正常跳焦點
      }
    },
    [disabled, open, options.length, highlight, openMenu, confirm, advance],
  );

  // 點外面關閉
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!btnRef.current?.parentElement?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // 高亮選項捲入視野
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-opt-idx="${highlight}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        data-kbd-select
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 0)}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-[#E8A020]/30 bg-[#0A0A0C] px-2.5 text-left text-sm outline-none transition-colors focus:border-[#E8A020]/60 focus:ring-1 focus:ring-[#E8A020]/40',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className={cn('truncate', selectedLabel ? 'text-[#E8E8EB]' : 'text-[#5A5A60]')}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-[#888892] transition-transform', open && 'rotate-180 text-[#E8A020]')} />
      </button>

      {open ? (
        <div
          ref={listRef}
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-60 w-full overflow-auto rounded-md border border-[#2A2A30] bg-[#131316] py-1 shadow-2xl nx-master-scroll"
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[#5A5A60]">無選項</div>
          ) : (
            options.map((o, i) => {
              const on = o.value === value;
              const focused = i === highlight;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={on}
                  data-opt-idx={i}
                  // onMouseDown 先於 button blur 觸發，避免 blur 關閉搶在 click 前
                  onMouseDown={(e) => {
                    e.preventDefault();
                    confirm(i);
                    setTimeout(advance, 0);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                    focused ? 'bg-[#E8A020]/15 text-[#E8A020]' : 'text-[#E8E8EB] hover:bg-[#1A1A22]',
                  )}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {on ? <Check className="size-3.5 text-[#E8A020]" /> : null}
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
