// apps/nx-ui/src/features/nx04/quote/ui/PartPicker.tsx
// 料號選擇器：關鍵字下拉（基準料號/廠牌料號/OEM 皆可比對）+ 下拉帶可出量
// 後端：/nx01/part-search（quickSearchParts、partNo 正規化比對），仿 CustomerPicker 範式
'use client';

import { useEffect, useRef, useState } from 'react';

import { quickSearchParts } from '@data/endpoints/nx01/part-search/api/part-search';
import type { PartSearchRow } from '@data/types/nx01/part-search';

export type PickedPart = {
  id: string;
  code: string;
  name: string;
  secCode: string | null;
  brandName: string | null;
  availableTotal: string;
  onHandTotal: string;
};

export function PartPicker({
  onPick,
  autoFocus,
}: {
  onPick: (p: PickedPart) => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<PartSearchRow[]>([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [picked, setPicked] = useState(false);
  const reqRef = useRef(0);

  // 關鍵字搜尋（debounce）；已選定後不自動搜
  useEffect(() => {
    if (picked) return;
    const t = text.trim();
    const myReq = ++reqRef.current;
    const h = setTimeout(async () => {
      if (!t) {
        setRows([]);
        setOpen(false);
        return;
      }
      try {
        const res = await quickSearchParts({ partNo: t, page: 1, pageSize: 20 });
        if (myReq !== reqRef.current) return;
        setRows(res.rows);
        setOpen(true);
        setHi(0);
      } catch {
        /* ignore */
      }
    }, 200);
    return () => clearTimeout(h);
  }, [text, picked]);

  function select(r: PartSearchRow) {
    setPicked(true);
    setText(`${r.code}　${r.name}`);
    setOpen(false);
    onPick({
      id: r.id,
      code: r.code,
      name: r.name,
      secCode: r.secCode,
      brandName: r.brandName,
      availableTotal: r.availableTotal,
      onHandTotal: r.onHandTotal,
    });
  }

  return (
    <div className="relative">
      <input
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => {
          setPicked(false);
          setText(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && open && rows.length) {
            e.preventDefault();
            setHi((h) => Math.min(rows.length - 1, h + 1));
            return;
          }
          if (e.key === 'ArrowUp' && open && rows.length) {
            e.preventDefault();
            setHi((h) => Math.max(0, h - 1));
            return;
          }
          if (e.key === 'Enter') {
            e.preventDefault(); // 不讓 Enter 送出整個 form
            if (open && rows.length) {
              const r = rows[hi];
              if (r) select(r);
            }
            return;
          }
          if (e.key === 'Escape' && open) {
            setOpen(false);
          }
        }}
        placeholder="輸入料號（基準/廠牌/OEM 皆可）"
        className="w-full rounded border bg-background px-2 py-1 text-sm"
      />
      {open && rows.length ? (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg">
          {rows.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                select(r);
              }}
              className={`block w-full px-2 py-1.5 text-left text-sm ${i === hi ? 'bg-primary/15' : ''} hover:bg-accent/15`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-mono text-xs text-muted-foreground">{r.code}</span>　{r.name}
                  {r.brandName ? <span className="ml-1 text-xs text-muted-foreground">· {r.brandName}</span> : null}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  可出{' '}
                  <span className={Number(r.availableTotal) > 0 ? 'font-semibold text-emerald-600' : ''}>
                    {Number(r.availableTotal).toLocaleString()}
                  </span>
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
