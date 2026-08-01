// apps/nx-ui/src/features/nx08/ar-check/ui/ArCheckView.tsx
//
// 對帳查詢（銷售第 7 格）—— v3.0.0，取代原本的施工中佔位頁。
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §4.2 §6
//
// 規格 §4.2 給的用途只有一句，但那一句就是全部：
//   「對帳查詢：出貨前看客戶有沒有逾期」
//
// 所以這一頁的主角是**客戶**，不是單據，也不是全公司總額：
//   · 一列一個客戶，逾期金額大的排最前面——打開就看到最該追的那幾家
//   · 逾期天數用顏色分級，⛔ 不用灰字（規格 §6）
//   · 上面三個大數字回答「我們總共被欠多少、其中多少過期了、幾家」
//
// ⚠️ 既有的 /nx08/dashboard/finance/ar-overview 是**財務視角**的全公司彙總，
//    答不了「這一家客戶欠不欠」，所以另外加了 ar-by-customer。舊的沒動。

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';

import { getArByCustomer, type ArByCustomerRow } from '@data/endpoints/nx08/api';

function money(v: string | null | undefined): string {
  if (v == null || v === '') return '0';
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : String(v);
}

/** 逾期天數分級。⛔ 不用灰字，過期越久顏色越重 */
function overdueTone(days: number): string {
  if (days <= 0) return 'text-foreground';
  if (days <= 15) return 'text-amber-600';
  return 'text-red-500';
}

export function ArCheckView() {
  const [rows, setRows] = useState<ArByCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [term, setTerm] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // ⚠️ 抓資料與「按重新整理」拆開：loading 初值就是 true，
  //    所以首次載入的 effect ⛔ 不在同步路徑上 setState（react-hooks/set-state-in-effect）
  const fetchRows = useCallback(async () => {
    try {
      const r = await getArByCustomer();
      setRows(r.rows);
      setErrorMsg(null);
    } catch (e: unknown) {
      setRows([]);
      setErrorMsg(e instanceof Error ? e.message : '讀取失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(() => {
    setLoading(true);
    setErrorMsg(null);
    void fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    void fetchRows();
    searchRef.current?.focus();
  }, [fetchRows]);

  // 客戶多的時候要找得到某一家——編號或名稱都能打
  const shown = useMemo(() => {
    const kw = term.trim().toLowerCase();
    if (!kw) return rows;
    return rows.filter(
      (r) =>
        (r.customerCode ?? '').toLowerCase().includes(kw) ||
        (r.customerName ?? '').toLowerCase().includes(kw),
    );
  }, [rows, term]);

  const totals = useMemo(() => {
    let open = 0;
    let overdue = 0;
    let overdueCustomers = 0;
    for (const r of rows) {
      open += Number(r.openAmount) || 0;
      const od = Number(r.overdueAmount) || 0;
      overdue += od;
      if (od > 0) overdueCustomers += 1;
    }
    return { open, overdue, overdueCustomers };
  }, [rows]);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 py-4">
      {/* 三個大數字：總共被欠多少、其中多少過期、幾家過期 */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border-2 border-border bg-card px-4 py-3">
          <div className="text-[15px] font-medium text-foreground">還沒收的錢</div>
          <div className="text-[30px] font-bold tabular-nums text-foreground">
            {loading ? '—' : money(String(totals.open))}
          </div>
        </div>
        <div
          className={`rounded-lg border-2 bg-card px-4 py-3 ${
            totals.overdue > 0 ? 'border-red-500' : 'border-border'
          }`}
        >
          <div className="text-[15px] font-medium text-foreground">其中已經過期</div>
          <div
            className={`text-[30px] font-bold tabular-nums ${
              totals.overdue > 0 ? 'text-red-500' : 'text-foreground'
            }`}
          >
            {loading ? '—' : money(String(totals.overdue))}
          </div>
        </div>
        <div className="rounded-lg border-2 border-border bg-card px-4 py-3">
          <div className="text-[15px] font-medium text-foreground">過期的客戶</div>
          <div className="text-[30px] font-bold tabular-nums text-foreground">
            {loading ? '—' : `${totals.overdueCustomers} 家`}
          </div>
        </div>
      </div>

      {/* 找某一家 */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[280px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground" />
          <input
            ref={searchRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="客戶編號／名稱"
            aria-label="找客戶"
            className="h-12 w-full rounded-lg border-2 border-border bg-card pl-12 pr-4 text-[16px] text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={reload}
          className="flex h-12 items-center gap-2 rounded-lg border-2 border-border bg-card px-4 text-[15px] font-medium text-foreground hover:bg-accent"
        >
          <RefreshCw className="h-4 w-4" />
          重新整理
        </button>
      </div>

      {errorMsg ? (
        <div className="mt-3 rounded-lg border-2 border-red-500 bg-red-500/10 px-4 py-2.5 text-[15px] text-foreground">
          讀取失敗：{errorMsg}
        </div>
      ) : null}

      {/* 一列一個客戶，逾期大的在前 */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border text-left">
              <th className="px-3 py-2.5 text-[14px] font-bold text-foreground">客戶</th>
              <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">還沒收</th>
              <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">已經過期</th>
              <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">過期最久</th>
              <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">未結筆數</th>
              <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">最近到期日</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-[15px] text-foreground/70">
                  查詢中…
                </td>
              </tr>
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-[15px] text-foreground/70">
                  {rows.length === 0 ? '目前沒有未收的帳款。' : '沒有符合的客戶。'}
                </td>
              </tr>
            ) : (
              shown.map((r) => {
                const overdue = Number(r.overdueAmount) || 0;
                return (
                  <tr key={r.customerId} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2.5">
                      <div className="text-[15px] font-medium text-foreground">
                        {r.customerName ?? '（查無客戶）'}
                      </div>
                      <div className="text-[14px] text-foreground/80">{r.customerCode ?? '—'}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[18px] font-bold tabular-nums text-foreground">
                      {money(r.openAmount)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right text-[18px] font-bold tabular-nums ${
                        overdue > 0 ? 'text-red-500' : 'text-foreground'
                      }`}
                    >
                      {overdue > 0 ? money(r.overdueAmount) : '—'}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right text-[16px] font-bold tabular-nums ${overdueTone(
                        r.maxOverdueDays,
                      )}`}
                    >
                      {r.maxOverdueDays > 0 ? `${r.maxOverdueDays} 天` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[15px] tabular-nums text-foreground">
                      {r.docCount}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[15px] tabular-nums text-foreground">
                      {r.nextDueDate ?? '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
