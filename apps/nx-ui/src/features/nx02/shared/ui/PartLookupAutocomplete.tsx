/**
 * File: apps/nx-ui/src/features/nx02/shared/ui/PartLookupAutocomplete.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-SHR-UI-001：零件 AutoComplete（GET /lookup/part）
 * - 下拉：portal + fixed；空間不足時改向上展開；避免被表格外層 overflow 裁切
 * - 鍵盤：↑↓ 選項、Enter 確認、Esc 關閉；確認後可 onCommittedSelection 交給下一欄 focus
 *
 * Notes:
 * - @FUNCTION_CODE NX02-SHR-UI-001-F01
 */

'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';

import { listLookupPart } from '@/features/nx00/lookup/api/lookup';
import type { LookupRow } from '@/features/nx00/lookup/types';
import { cx } from '@/shared/lib/cx';

const DEBOUNCE_MS = 250;
/** 高於常見 modal／側欄，避免被遮住 */
const DROPDOWN_Z = 200_000;
const LIST_MAX_PX = 280;

function assignRef<T>(r: Ref<T> | undefined, value: T | null) {
  if (!r) return;
  if (typeof r === 'function') (r as (x: T | null) => void)(value);
  else (r as MutableRefObject<T | null>).current = value;
}

type Anchor =
  | null
  | { variant: 'below'; top: number; left: number; width: number; maxHeight: number }
  | { variant: 'above'; bottom: number; left: number; width: number; maxHeight: number };

export type PartLookupAutocompleteProps = {
  disabled?: boolean;
  partId: string;
  partCode?: string;
  partName?: string;
  onChange: (p: { id: string; code: string; name: string } | null) => void;
  /** 以鍵盤或滑鼠「確認選取」後呼叫（可用 queueMicrotask 接下一欄 focus） */
  onCommittedSelection?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  placeholder?: string;
  inputClassName?: string;
};

/**
 * @FUNCTION_CODE NX02-SHR-UI-001-F01
 */
export function PartLookupAutocomplete({
  disabled,
  partId,
  partCode,
  partName,
  onChange,
  onCommittedSelection,
  inputRef,
  placeholder = '輸入料號或品名搜尋…',
  inputClassName,
}: PartLookupAutocompleteProps) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<LookupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [anchor, setAnchor] = useState<Anchor>(null);
  const listboxId = useId();

  useEffect(() => {
    if (partId && partCode) setQ(partCode);
    else if (!partId) setQ('');
  }, [partId, partCode]);

  useEffect(() => {
    setHighlight(-1);
    itemRefs.current = [];
  }, [rows]);

  useEffect(() => {
    if (highlight < 0) return;
    const el = itemRefs.current[highlight];
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const syncAnchor = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, 200);
    const margin = 8;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const preferBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;
    if (preferBelow) {
      setAnchor({
        variant: 'below',
        top: rect.bottom + 4,
        left: rect.left,
        width,
        maxHeight: Math.min(LIST_MAX_PX, Math.max(120, spaceBelow)),
      });
    } else {
      setAnchor({
        variant: 'above',
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width,
        maxHeight: Math.min(LIST_MAX_PX, Math.max(120, spaceAbove)),
      });
    }
  }, []);

  const showList = open && !disabled && Boolean(q.trim());

  useLayoutEffect(() => {
    if (!showList) {
      setAnchor(null);
      return;
    }
    syncAnchor();
    const el = wrapRef.current;
    const ro =
      typeof ResizeObserver !== 'undefined' && el ? new ResizeObserver(() => syncAnchor()) : null;
    if (el && ro) ro.observe(el);
    const onReposition = () => syncAnchor();
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      ro?.disconnect();
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [showList, syncAnchor, loading, rows.length]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (disabled) return;
    const term = q.trim();
    if (!term) {
      setRows([]);
      setLoading(false);
      return;
    }
    let alive = true;
    const t = window.setTimeout(() => {
      setLoading(true);
      listLookupPart({ q: term, pageSize: 20 })
        .then((r) => {
          if (alive) setRows(r);
        })
        .catch(() => {
          if (alive) setRows([]);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [q, disabled]);

  const onInputChange = useCallback(
    (v: string) => {
      setQ(v);
      setOpen(true);
      setHighlight(-1);
      if (partId) onChange(null);
    },
    [partId, onChange],
  );

  const pick = useCallback(
    (r: LookupRow) => {
      onChange({ id: r.id, code: r.code, name: r.name });
      setQ(r.code);
      setOpen(false);
      setRows([]);
      setAnchor(null);
      setHighlight(-1);
      queueMicrotask(() => onCommittedSelection?.());
    },
    [onChange, onCommittedSelection],
  );

  const clear = useCallback(() => {
    onChange(null);
    setQ('');
    setRows([]);
    setOpen(false);
    setAnchor(null);
    setHighlight(-1);
  }, [onChange]);

  const onInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      const listOpen = showList && !loading && rows.length > 0;

      if (e.key === 'Escape') {
        if (open) {
          e.preventDefault();
          setOpen(false);
          setHighlight(-1);
        }
        return;
      }

      if (listOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlight((h) => (h + 1 >= rows.length ? 0 : h + 1));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlight((h) => (h <= 0 ? rows.length - 1 : h - 1));
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const i = highlight >= 0 ? highlight : 0;
          pick(rows[i]);
          return;
        }
      }

      if (e.key === 'Enter' && !listOpen && partId.trim()) {
        e.preventDefault();
        onCommittedSelection?.();
      }
    },
    [disabled, showList, loading, rows, highlight, pick, open, partId, onCommittedSelection],
  );

  const dropdown =
    showList &&
    anchor &&
    typeof document !== 'undefined' &&
    createPortal(
      <ul
        ref={listRef}
        role="listbox"
        id={listboxId}
        className="overflow-auto rounded-lg border border-border bg-popover shadow-lg"
        style={{
          position: 'fixed',
          left: anchor.left,
          width: anchor.width,
          maxHeight: anchor.maxHeight,
          zIndex: DROPDOWN_Z,
          ...(anchor.variant === 'below'
            ? { top: anchor.top, bottom: 'auto' }
            : { bottom: anchor.bottom, top: 'auto' }),
        }}
      >
        {loading ? (
          <li className="px-3 py-2 text-xs text-muted-foreground">搜尋中…</li>
        ) : rows.length === 0 ? (
          <li className="px-3 py-2 text-xs text-muted-foreground">無符合結果</li>
        ) : (
          rows.map((r, i) => (
            <li key={r.id} role="option" aria-selected={highlight === i}>
              <button
                type="button"
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                className={cx(
                  'w-full px-3 py-2 text-left text-xs',
                  highlight === i ? 'bg-muted' : 'hover:bg-muted/80',
                )}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(r)}
              >
                <span className="font-mono">{r.code}</span>
                <span className="ml-2 text-muted-foreground">{r.name}</span>
              </button>
            </li>
          ))
        )}
      </ul>,
      document.body,
    );

  return (
    <div ref={wrapRef} className="relative min-w-[200px]">
      <div className="flex gap-1">
        <input
          ref={(node) => assignRef(inputRef, node)}
          type="text"
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className={cx(
            'w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs',
            inputClassName,
          )}
          placeholder={placeholder}
          value={q}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
        />
        {partId ? (
          <button
            type="button"
            disabled={disabled}
            className="shrink-0 rounded border border-border px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={clear}
            title="清除"
          >
            ×
          </button>
        ) : null}
      </div>
      {partName && partId ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{partName}</p> : null}
      {dropdown}
    </div>
  );
}
