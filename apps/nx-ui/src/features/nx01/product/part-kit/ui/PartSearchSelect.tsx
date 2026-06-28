// apps/nx-ui/src/features/nx01/product/part-kit/ui/PartSearchSelect.tsx
// 零件搜尋選擇器（combobox）：輸入料號/品名即時搜尋、點選回傳零件
// 2026-06-28 取代組合零件編輯彈窗原本的「料號 ID 純文字輸入」
'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

import { cn } from '@design/utils/cn';
import { listParts, type PartDto } from '@data/endpoints/nx01/api/part';

export function PartSearchSelect({
  value,
  label,
  disabled,
  placeholder,
  onChange,
}: {
  /** 已選零件內碼 id */
  value: string;
  /** 顯示文字（料號 品名）；未提供時退回 value */
  label?: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (part: PartDto) => void;
}) {
  const [open, setOpen] = useState(false);
  const [kw, setKw] = useState('');
  const [results, setResults] = useState<PartDto[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // 開啟時依關鍵字（debounce）搜尋
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      void listParts({ q: kw.trim() || undefined, pageSize: 30, isActive: true })
        .then((r) => {
          if (!cancelled) setResults(r.items);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, kw]);

  // 點外面關閉
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-md border border-border/50 bg-background px-2.5 text-sm text-foreground',
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-border',
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate text-left', !value && 'text-muted-foreground')}>
          {value ? label || value : placeholder ?? '搜尋並選擇零件…'}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {open && !disabled ? (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border/40 bg-popover shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border/40 px-2.5 py-1.5">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              placeholder="料號或品名…"
              className="flex-1 bg-transparent text-sm text-foreground outline-none"
            />
          </div>
          <ul className="max-h-60 overflow-auto p-1">
            {loading ? (
              <li className="px-2 py-3 text-center text-xs text-muted-foreground">搜尋中…</li>
            ) : results.length === 0 ? (
              <li className="px-2 py-3 text-center text-xs text-muted-foreground">
                {kw.trim() ? '查無符合的零件' : '輸入料號或品名搜尋'}
              </li>
            ) : (
              results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(p);
                      setOpen(false);
                      setKw('');
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-accent/15',
                      value === p.id && 'bg-primary/10',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs text-foreground">{p.code}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{p.name}</span>
                    </span>
                    {value === p.id ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
