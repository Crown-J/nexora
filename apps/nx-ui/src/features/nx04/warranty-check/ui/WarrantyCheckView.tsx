// apps/nx-ui/src/features/nx04/warranty-check/ui/WarrantyCheckView.tsx
//
// 保固查詢（銷售第 8 格）—— v3.0.0
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §4.2 §6
//
// ⚠️ 這一格原本會**轉址到採購的「保固求償」**，那是不同的功能：
//     · 銷售的保固查詢 ＝ 業務查「客戶這顆還在保固內嗎」
//     · 採購的保固求償 ＝ 向供應商求償的單據流程
//    規格 §4.2 把兩者分在兩個角色，不該共用一頁。
//
// ⚠️ 誠實揭露（畫面上也有寫）：系統目前**沒有銷售端的保固紀錄表**，
//    而且零件主檔的保固月數 110,610 筆全部是 0 → 「還在不在保固內」現在算不出來。
//    所以這一頁先回答業務接到客訴時的第一個問題：
//      「這個客戶買過這顆嗎、什麼時候買的、買了幾個、當時多少錢」
//    保固到期日那一欄等產品部把零件的保固月數填上就會自己出現，⛔ 不猜一個期限充數。

'use client';

import { useCallback, useRef, useState } from 'react';
import { Search } from 'lucide-react';

import { getWarrantyLookup, type WarrantyLookupRow } from '@data/endpoints/nx04/so/api/so';

import { CustomerPicker, type PickedCustomer } from '../../quote/ui/CustomerPicker';

function fmt(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : String(v);
}

export function WarrantyCheckView() {
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [partNo, setPartNo] = useState('');
  const [rows, setRows] = useState<WarrantyLookupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const partRef = useRef<HTMLInputElement>(null);

  const run = useCallback(
    (cust: PickedCustomer | null, pno: string) => {
      const c = cust?.id ?? '';
      const p = pno.trim();
      if (!c && !p) {
        setRows([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      setSearched(true);
      getWarrantyLookup({ customerId: c || undefined, partNo: p || undefined })
        .then((r) => setRows(r.rows))
        .catch(() => setRows([]))
        .finally(() => setLoading(false));
    },
    [],
  );

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 py-4">
      {/* 兩個條件都選填：只給客戶＝他買過什麼；只給料號＝這顆賣給過誰 */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[280px]">
          <div className="mb-1 text-[14px] font-medium text-foreground">客戶</div>
          {customer ? (
            <div className="flex h-12 items-center gap-2 rounded-lg border-2 border-border bg-card px-3">
              <span className="text-[15px] font-medium text-foreground">
                {customer.code} {customer.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCustomer(null);
                  run(null, partNo);
                }}
                className="ml-auto rounded border border-border px-2 py-0.5 text-[13px] hover:bg-accent"
              >
                清除
              </button>
            </div>
          ) : (
            <CustomerPicker
              onPick={(c) => {
                setCustomer(c);
                run(c, partNo);
              }}
              onCommit={() => partRef.current?.focus()}
              partnerType="C,O"
            />
          )}
        </div>

        <div className="relative min-w-[280px] flex-1">
          <div className="mb-1 text-[14px] font-medium text-foreground">料號</div>
          <Search className="pointer-events-none absolute left-4 top-[42px] h-5 w-5 -translate-y-1/2 text-foreground" />
          <input
            ref={partRef}
            value={partNo}
            onChange={(e) => setPartNo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                run(customer, partNo);
              }
            }}
            placeholder="料號（可只填客戶）"
            aria-label="料號"
            className="h-12 w-full rounded-lg border-2 border-border bg-card pl-12 pr-4 text-[16px] text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => run(customer, partNo)}
          className="h-12 rounded-lg border-2 border-border bg-card px-5 text-[15px] font-medium text-foreground hover:bg-accent"
        >
          查詢
        </button>
      </div>

      {/* ⛔ 不假裝算得出保固——講清楚為什麼那一欄是空的 */}
      <p className="mt-3 rounded-lg border-2 border-amber-500 bg-amber-500/10 px-4 py-2.5 text-[14px] text-foreground">
        ⚠️ 目前算不出「還在不在保固內」：零件主檔的保固月數還沒有人填（110,610 筆全是 0），
        系統也還沒有銷售端的保固紀錄。這一頁先回答「買過沒有、什麼時候買的」，
        產品部把保固月數填上之後，右邊兩欄就會自己有值。
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border text-left">
              <th className="px-3 py-2.5 text-[14px] font-bold text-foreground">銷貨單 / 日期</th>
              <th className="px-3 py-2.5 text-[14px] font-bold text-foreground">客戶</th>
              <th className="px-3 py-2.5 text-[14px] font-bold text-foreground">料號 / 品名</th>
              <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">數量</th>
              <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">當時單價</th>
              <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">保固到期</th>
              <th className="px-3 py-2.5 text-[14px] font-bold text-foreground">還在保固？</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-[15px] text-foreground/70">
                  查詢中…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-[15px] text-foreground/70">
                  {searched ? '這個條件查不到出貨紀錄。' : '選一個客戶、或打一個料號，按查詢。'}
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.docNo}-${r.partCode}-${i}`} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2.5">
                    <div className="text-[15px] font-medium text-foreground">{r.docNo}</div>
                    <div className="text-[14px] text-foreground/80">{r.soDate ?? '—'}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-[15px] text-foreground">{r.customerName ?? '—'}</div>
                    <div className="text-[14px] text-foreground/80">{r.customerCode ?? ''}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-[15px] font-medium text-foreground">{r.partCode}</div>
                    <div className="text-[14px] text-foreground/80">{r.partName}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-[16px] font-bold tabular-nums text-foreground">
                    {fmt(r.qty)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[15px] tabular-nums text-foreground">
                    {fmt(r.unitPrice)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[15px] tabular-nums text-foreground">
                    {r.warrantyUntil ?? '未設定'}
                  </td>
                  <td className="px-3 py-2.5 text-[15px]">
                    {r.inWarranty == null ? (
                      <span className="text-foreground/70">不知道</span>
                    ) : r.inWarranty ? (
                      <span className="font-bold text-foreground">✅ 還在保</span>
                    ) : (
                      <span className="font-bold text-red-500">已過保</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
