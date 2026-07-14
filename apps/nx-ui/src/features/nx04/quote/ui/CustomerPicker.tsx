// apps/nx-ui/src/features/nx04/quote/ui/CustomerPicker.tsx
// 客戶選擇器：關鍵字下拉（編號/名稱）+ Alt+Z 注音首碼搜尋（例：we→ㄊㄍ→太古；原 F4、2026-07-14 清場）
// 後端：/nx01/partners 支援 search 與 phonetic（phonetic_index）查詢
'use client';

import { useEffect, useRef, useState } from 'react';

import { listPartner } from '@data/endpoints/shared/master/partner/api/partner';

// 台灣標準注音鍵盤映射（沿用 PhoneticPicker）；Alt+Z 把英文鍵碼轉注音再查
const KEY2BOPOMOFO: Record<string, string> = {
  '1': 'ㄅ', '2': 'ㄉ', '3': 'ˇ', '4': 'ˋ', '5': 'ㄓ', '6': 'ˊ', '7': '˙', '8': 'ㄚ', '9': 'ㄞ', '0': 'ㄢ', '-': 'ㄦ',
  q: 'ㄆ', w: 'ㄊ', e: 'ㄍ', r: 'ㄐ', t: 'ㄔ', y: 'ㄗ', u: 'ㄧ', i: 'ㄛ', o: 'ㄟ', p: 'ㄣ',
  a: 'ㄇ', s: 'ㄋ', d: 'ㄎ', f: 'ㄑ', g: 'ㄕ', h: 'ㄘ', j: 'ㄨ', k: 'ㄜ', l: 'ㄠ', ';': 'ㄤ',
  z: 'ㄈ', x: 'ㄌ', c: 'ㄏ', v: 'ㄒ', b: 'ㄖ', n: 'ㄙ', m: 'ㄩ', ',': 'ㄝ', '.': 'ㄡ', '/': 'ㄥ',
};
export function keyToBopomofo(s: string): string {
  return s
    .toLowerCase()
    .split('')
    .map((c) => KEY2BOPOMOFO[c] ?? c)
    .join('');
}

export type PickedCustomer = {
  id: string;
  code: string;
  name: string;
  defaultWarehouseId?: string | null;
  defaultWarehouseName?: string | null;
};

export function CustomerPicker({
  onPick,
  onCommit,
  autoFocus,
  partnerType = 'C',
  inputRef,
}: {
  /** 選定客戶 */
  onPick: (c: PickedCustomer) => void;
  /** 已選後再按 Enter → 跳下一欄 */
  onCommit: () => void;
  autoFocus?: boolean;
  /** partner 類型過濾（預設 C 客戶；即時詢價傳 O 挑同行；進貨單傳 S 挑供應商）*/
  partnerType?: 'C' | 'O' | 'S';
  /** 外部要拿輸入框 ref（FocusLockedDialog initialFocusRef 用、比照 PartPicker）*/
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<PickedCustomer[]>([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [picked, setPicked] = useState(false);
  const reqRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  // 鍵盤 ↑↓ 時把高亮列捲入可視
  useEffect(() => {
    listRef.current?.querySelector(`[data-hi="${hi}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [hi, open]);

  // 關鍵字搜尋（debounce）；已選定後不自動搜。所有 setState 走 timeout（非 effect 同步）
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
        const res = await listPartner({ page: 1, pageSize: 20, q: t, partnerType, isActive: true });
        if (myReq !== reqRef.current) return;
        setRows(
          res.items.map((p) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            defaultWarehouseId: p.defaultWarehouseId,
            defaultWarehouseName: p.defaultWarehouseName,
          })),
        );
        setOpen(true);
        setHi(0);
      } catch {
        /* ignore */
      }
    }, 200);
    return () => clearTimeout(h);
  }, [text, picked, partnerType]);

  async function doPhonetic() {
    const code = keyToBopomofo(text.trim());
    if (!code) return;
    const myReq = ++reqRef.current;
    try {
      const res = await listPartner({ page: 1, pageSize: 20, phonetic: code, partnerType, isActive: true });
      if (myReq !== reqRef.current) return;
      setRows(res.items.map((p) => ({ id: p.id, code: p.code, name: p.name })));
      setOpen(true);
      setHi(0);
    } catch {
      /* ignore */
    }
  }

  function select(c: PickedCustomer) {
    setPicked(true);
    setText(`${c.code}　${c.name}`);
    setOpen(false);
    onPick(c);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => {
          setPicked(false);
          setText(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'z') {
            // Alt+Z 注音首碼（原 F4、2026-07-14 F 鍵清場）
            e.preventDefault();
            void doPhonetic();
            return;
          }
          if (open && rows.length) {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHi((h) => Math.min(rows.length - 1, h + 1));
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHi((h) => Math.max(0, h - 1));
              return;
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              const r = rows[hi];
              if (r) select(r);
              return;
            }
            if (e.key === 'Escape') {
              setOpen(false);
              return;
            }
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            if (picked) onCommit();
          }
        }}
        placeholder="輸入編號/名稱；注音首碼按 Alt+Z（例 we→太古）"
        className="w-full rounded border bg-background px-2 py-1 text-sm"
      />
      {open && rows.length ? (
        <div ref={listRef} className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg">
          {rows.map((r, i) => (
            <button
              key={r.id}
              type="button"
              data-hi={i}
              onMouseDown={(e) => {
                e.preventDefault();
                select(r);
              }}
              className={`block w-full px-2 py-1.5 text-left text-sm ${i === hi ? 'bg-primary/15' : ''} hover:bg-accent/15`}
            >
              <span className="font-mono text-xs text-muted-foreground">{r.code}</span>　{r.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
