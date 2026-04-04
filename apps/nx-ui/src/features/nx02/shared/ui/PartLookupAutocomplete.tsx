/**
 * File: apps/nx-ui/src/features/nx02/shared/ui/PartLookupAutocomplete.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-SHR-UI-001：零件 AutoComplete（GET /lookup/part，料號／品名即時搜尋）
 *
 * Notes:
 * - @FUNCTION_CODE NX02-SHR-UI-001-F01
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { listLookupPart } from '@/features/nx00/lookup/api/lookup';
import type { LookupRow } from '@/features/nx00/lookup/types';
import { cx } from '@/shared/lib/cx';

const DEBOUNCE_MS = 250;

export type PartLookupAutocompleteProps = {
  disabled?: boolean;
  partId: string;
  partCode?: string;
  partName?: string;
  /** 選取或清除（清除時傳 null） */
  onChange: (p: { id: string; code: string; name: string } | null) => void;
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
  placeholder = '輸入料號或品名搜尋…',
  inputClassName,
}: PartLookupAutocompleteProps) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<LookupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (partId && partCode) setQ(partCode);
    else if (!partId) setQ('');
  }, [partId, partCode]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
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
    },
    [onChange],
  );

  const clear = useCallback(() => {
    onChange(null);
    setQ('');
    setRows([]);
    setOpen(false);
  }, [onChange]);

  return (
    <div ref={wrapRef} className="relative min-w-[200px]">
      <div className="flex gap-1">
        <input
          type="text"
          disabled={disabled}
          autoComplete="off"
          className={cx(
            'w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs',
            inputClassName,
          )}
          placeholder={placeholder}
          value={q}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
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
      {open && !disabled && q.trim() && (
        <ul className="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-popover shadow-md">
          {loading ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">搜尋中…</li>
          ) : rows.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">無符合結果</li>
          ) : (
            rows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-xs hover:bg-muted/80"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(r)}
                >
                  <span className="font-mono">{r.code}</span>
                  <span className="ml-2 text-muted-foreground">{r.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
