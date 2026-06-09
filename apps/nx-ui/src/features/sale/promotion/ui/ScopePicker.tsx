// apps/nx-ui/src/features/sale/promotion/ui/ScopePicker.tsx
// F1-E 銷貨優惠價子系統 2026-06-09：scope picker 升級（取代手動貼 ID）
//
// 範式：
//   - 單一輸入框內顯示「已選項目 label」、點擊展開搜尋下拉（debounce 250ms）
//   - 依 scopeType 切換來源 API（P=parts / B=brands / G=part-groups）
//   - 維護內部 selected label（若 caller 沒給 currentLabel 則 fetch byId 補）

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { apiJson } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';

import type { ScopeType } from '../types';

interface ScopeEntity {
  id: string;
  code?: string;
  name?: string;
}

interface ScopeListResponse {
  items?: ScopeEntity[];
  rows?: ScopeEntity[];
}

const ENDPOINTS: Record<ScopeType, string> = {
  P: '/nx01/parts',
  B: '/nx01/brands',
  G: '/nx01/part-groups',
};

const PLACEHOLDER: Record<ScopeType, string> = {
  P: '搜尋料件（料號 / 品名）',
  B: '搜尋品牌（代碼 / 名稱）',
  G: '搜尋族群（代碼 / 名稱）',
};

function formatLabel(e: ScopeEntity): string {
  const parts: string[] = [];
  if (e.code) parts.push(e.code);
  if (e.name) parts.push(e.name);
  return parts.length > 0 ? parts.join(' · ') : e.id;
}

async function fetchScopeList(scopeType: ScopeType, search: string): Promise<ScopeEntity[]> {
  const qs = buildQueryString({
    pageSize: '20',
    isActive: 'true',
    search: search.trim() || undefined,
  });
  const res = await apiJson<ScopeListResponse>(`${ENDPOINTS[scopeType]}${qs}`);
  return res.items ?? res.rows ?? [];
}

async function fetchScopeById(scopeType: ScopeType, id: string): Promise<ScopeEntity | null> {
  try {
    return await apiJson<ScopeEntity>(`${ENDPOINTS[scopeType]}/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export interface ScopePickerProps {
  scopeType: ScopeType;
  value: string;
  onChange: (id: string, label: string) => void;
  disabled?: boolean;
}

export function ScopePicker({ scopeType, value, onChange, disabled }: ScopePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ScopeEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLabel, setCurrentLabel] = useState('');
  const lastScopeType = useRef(scopeType);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // scopeType 換 → 清空 value（caller 應該也會清，但雙保險）
  useEffect(() => {
    if (lastScopeType.current !== scopeType) {
      lastScopeType.current = scopeType;
      setCurrentLabel('');
    }
  }, [scopeType]);

  // value 變動 → 反查 label
  useEffect(() => {
    if (!value) {
      setCurrentLabel('');
      return;
    }
    let cancelled = false;
    void (async () => {
      const e = await fetchScopeById(scopeType, value);
      if (!cancelled) setCurrentLabel(e ? formatLabel(e) : value);
    })();
    return () => {
      cancelled = true;
    };
  }, [value, scopeType]);

  // 展開時 debounce 抓搜尋結果
  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchScopeList(scopeType, search);
        setResults(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : '搜尋失敗');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [open, search, scopeType]);

  // click outside → 關閉
  useEffect(() => {
    if (!open) return;
    const onClick = (ev: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handlePick = useCallback(
    (e: ScopeEntity) => {
      const lbl = formatLabel(e);
      setCurrentLabel(lbl);
      onChange(e.id, lbl);
      setOpen(false);
      setSearch('');
    },
    [onChange],
  );

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between rounded-md border bg-background px-2 py-1 text-left text-sm hover:border-primary/50 disabled:opacity-50"
      >
        <span className={value ? '' : 'text-muted-foreground'}>
          {value ? (
            <span className="space-x-1">
              <span className="font-mono text-xs text-muted-foreground">{value}</span>
              <span>{currentLabel && currentLabel !== value ? `· ${currentLabel}` : ''}</span>
            </span>
          ) : (
            PLACEHOLDER[scopeType]
          )}
        </span>
        <span className="text-xs text-muted-foreground">▾</span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={PLACEHOLDER[scopeType]}
            className="w-full border-b bg-background px-2 py-1.5 text-sm outline-none"
          />
          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">搜尋中…</p>
            ) : error ? (
              <p className="px-2 py-3 text-center text-xs text-destructive">{error}</p>
            ) : results.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                {search.trim() ? '無結果' : '輸入關鍵字搜尋'}
              </p>
            ) : (
              results.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => handlePick(e)}
                  className="block w-full px-2 py-1.5 text-left text-sm hover:bg-muted/40"
                >
                  <div className="font-mono text-xs text-muted-foreground">{e.id}</div>
                  <div>{formatLabel(e)}</div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
