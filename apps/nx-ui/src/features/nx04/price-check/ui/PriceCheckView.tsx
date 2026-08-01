// apps/nx-ui/src/features/nx04/price-check/ui/PriceCheckView.tsx
//
// 查價查貨（銷售第 1 格）—— v3.0.0 重做，執行長 2026-08-01 拍板 A 案。
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §2.1 §4.2 §6 §7
//
// 為什麼重做（執行長 2026-08-01）：
//   舊的站 1 是「料號即時搜尋」彈窗，2026-06-25 的任務單寫得很清楚，
//   它要回答的是「公司到底有沒有貨」——總可出量／在途／庫存水位／各倉分布，
//   ⚠️ 那是**倉管視角**。價格不是它自己的東西，是報價流程用 slot 從外面掛進去的。
//   所以「查價查貨」這個名字，舊版實際只做到「查貨」。
//
// 這一頁是**業務視角**：業務接到電話問一支料，當下要講的三件事——
//   ① 有沒有貨（可出量）② 賣多少（建議售價）③ 上次賣他多少（議價依據）
//   一列就答完，⛔ 不用點進去、不用切視窗。
//
// ⛔ 一頁式，不是彈窗（規格 §2.1）。舊的 FocusLockedDialog 浮層範式在 v3.0.0 不再延用。
//
// ⭐ 料號優先、客戶選填（執行長拍板 A 案，⛔ 不是先選客戶再查料）：
//    理由＝規格 §3.3「客戶隨時來詢價是常態，進系統就能直接打料號」。
//    沒選客戶時建議售價與「上次賣他」會是「—」（⛔ 不猜、不拿別人的價充數），
//    但可出量與市場近價照給；選了客戶，整張表立刻換成他的價。
//
// ⚠️ 下游還是舊的：「加入調貨詢價」開的仍是浮層工作站。
//    那條鏈的一頁式改造屬規格階段 4，本頁先不動它。

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

import { checkCredit, type CreditCheckBlocked, type CreditCheckResult } from '@data/endpoints/nx04/credit-guard/api/credit-guard';
import { getQuoteCandidates } from '@data/endpoints/nx04/quote/api/quote';
import { quickSearchParts } from '@data/endpoints/nx01/part-search/api/part-search';
import type { PartSearchRow } from '@data/types/nx01/part-search';
import type { QuoteCandidate } from '@data/types/nx04/quote';

import { CustomerPicker, type PickedCustomer } from '../../quote/ui/CustomerPicker';

/** 加入調貨詢價的事件（GlobalTransferInquiry 監聽）。⚠️ 下游仍是浮層、階段 4 再改 */
const TRANSFER_ADD_EVENT = 'nx-transfer-add';

function fmtQty(v: string | null | undefined): string {
  if (v == null || v === '') return '0';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : String(v);
}

function fmtMoney(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : String(v);
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return '';
  return v.slice(0, 10);
}

/**
 * 全公司可出量＝各倉相加。
 * ⚠️ 為什麼不直接用 warehouseAvailable：那一欄只算「出貨倉」一個倉，
 *    沒選客戶時出貨倉是主倉，數字會比左邊命中清單的總量小——同一支料兩個數字，會被當成 bug。
 *    業務接電話問的是「公司到底有沒有」，所以主要數字給總量，單倉另外標。
 */
function totalAvailable(c: QuoteCandidate): number {
  return Object.values(c.stockByWh ?? {}).reduce((sum, v) => {
    const n = Number(v);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export function PriceCheckView() {
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<PartSearchRow[]>([]);
  const [hitIdx, setHitIdx] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [credit, setCredit] = useState<CreditCheckResult | CreditCheckBlocked | null>(null);

  const [rows, setRows] = useState<QuoteCandidate[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  /** 候選查詢用的出貨倉（沒選客戶＝主倉）；⚠️ 只在選了客戶時才顯示單倉數字，見下方註解 */
  const [whName, setWhName] = useState<string>('');

  const searchRef = useRef<HTMLInputElement>(null);
  const hitListRef = useRef<HTMLDivElement>(null);
  const reqRef = useRef(0);

  // 規格 §3.3：進來游標就在搜尋框，客戶隨時來電就能直接打料號
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const runSearch = useCallback(async () => {
    const kw = term.trim();
    if (!kw) return;
    setSearching(true);
    setSearched(true);
    const seq = ++reqRef.current;
    try {
      // 料號、品名、車型一起搜——業務講得出哪個就用哪個（規格 §3.3 的搜尋框就是這三種）
      const res = await quickSearchParts({ partNo: kw, pageSize: 50 });
      let list = res.rows;
      if (list.length === 0) {
        const alt = await quickSearchParts({ keyword: kw, modelQuery: kw, pageSize: 50 });
        list = alt.rows;
      }
      if (seq !== reqRef.current) return;
      setHits(list);
      setHitIdx(0);
    } catch {
      if (seq !== reqRef.current) return;
      setHits([]);
    } finally {
      if (seq === reqRef.current) setSearching(false);
    }
  }, [term]);

  // 選中的命中料 → 拉整組候選（主件＋替代料，每列帶可出量／建議價／上次賣他）
  const currentPartId = hits[hitIdx]?.id ?? null;
  useEffect(() => {
    if (!currentPartId) {
      setRows([]);
      return;
    }
    let alive = true;
    setRowsLoading(true);
    getQuoteCandidates(currentPartId, customer?.id, customer?.defaultWarehouseId ?? undefined)
      .then((r) => {
        if (!alive) return;
        setRows(r.candidates);
        setWhName(r.warehouseName ?? '');
      })
      .catch(() => {
        if (!alive) return;
        setRows([]);
        setWhName('');
      })
      .finally(() => {
        if (alive) setRowsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [currentPartId, customer]);

  // 選了客戶 → 問一次「他現在能不能出貨」
  useEffect(() => {
    if (!customer) {
      setCredit(null);
      return;
    }
    let alive = true;
    checkCredit(customer.id, 0)
      .then((r) => alive && setCredit(r))
      .catch(() => alive && setCredit(null));
    return () => {
      alive = false;
    };
  }, [customer]);

  /** 加入調貨詢價：沒貨時的 plan B */
  const addToTransfer = useCallback(
    (c: QuoteCandidate) => {
      window.dispatchEvent(
        new CustomEvent(TRANSFER_ADD_EVENT, {
          detail: {
            items: [
              {
                customerId: customer?.id ?? null,
                customerCode: customer?.code ?? null,
                customerName: customer?.name ?? null,
                partId: c.id,
                code: c.code,
                name: c.name,
                qty: 1,
              },
            ],
          },
        }),
      );
    },
    [customer],
  );

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 py-4">
      {/* ── 搜尋列：料號優先、客戶選填 ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[320px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground" />
          <input
            ref={searchRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void runSearch();
                // 搜完把焦點交給命中清單，↑↓ 就能直接挑（規格 §7.1：拔掉滑鼠也要做得完）
                setTimeout(() => hitListRef.current?.focus(), 0);
              }
            }}
            placeholder="料號／品名／車型"
            aria-label="查價查貨"
            className="h-14 w-full rounded-lg border-2 border-border bg-card pl-12 pr-4 text-[17px] text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none"
          />
        </div>

        <div className="min-w-[260px]">
          <div className="mb-1 text-[13px] text-foreground/70">客戶（選填．選了才有他的價）</div>
          {customer ? (
            <div className="flex h-11 items-center gap-2 rounded-lg border-2 border-border bg-card px-3">
              <span className="text-[15px] font-medium text-foreground">
                {customer.code} {customer.name}
              </span>
              <button
                type="button"
                onClick={() => setCustomer(null)}
                className="ml-auto rounded border border-border px-2 py-0.5 text-[13px] hover:bg-accent"
              >
                清除
              </button>
            </div>
          ) : (
            <CustomerPicker onPick={setCustomer} onCommit={() => {}} partnerType="C,O" />
          )}
        </div>
      </div>

      {/* ── 客戶狀態警示：出貨前先知道能不能出（規格 §4.2 對帳查詢的同一個動機）── */}
      {credit && !credit.passed ? (
        <div className="mt-3 rounded-lg border-2 border-red-500 bg-red-500/10 px-4 py-2.5 text-[15px] font-medium text-foreground">
          ⛔ 這個客戶目前擋單：{credit.blockedReason}
        </div>
      ) : null}
      {credit && credit.passed && credit.overdueTransferToCash ? (
        <div className="mt-3 rounded-lg border-2 border-amber-500 bg-amber-500/10 px-4 py-2.5 text-[15px] font-medium text-foreground">
          ⚠️ 這個客戶已逾期 {credit.details.overdueDays} 天——這一單要收現金。
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* ── 命中清單 ── */}
        <div
          ref={hitListRef}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHitIdx((i) => Math.min(i + 1, hits.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHitIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Escape') {
              e.preventDefault();
              searchRef.current?.focus();
            }
          }}
          className="rounded-lg border border-border bg-card p-2 focus:outline focus:outline-2 focus:outline-primary"
        >
          <div className="px-1 pb-2 text-[14px] font-bold text-foreground">
            找到 {hits.length} 筆{searching ? '（查詢中…）' : ''}
          </div>
          {hits.length === 0 ? (
            <div className="px-1 py-4 text-[14px] text-foreground/70">
              {searched && !searching ? '沒有符合的零件。' : '打料號、品名或車型，按 Enter。'}
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              {hits.map((h, i) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setHitIdx(i)}
                  className={`block w-full rounded-md px-2 py-2 text-left ${
                    i === hitIdx ? 'bg-primary/15 ring-2 ring-primary' : 'hover:bg-foreground/[0.05]'
                  }`}
                >
                  <div className="text-[15px] font-medium text-foreground">{h.code}</div>
                  <div className="text-[14px] text-foreground/80">{h.name}</div>
                  <div className="text-[13px] text-foreground/70">
                    {h.brandName ?? '—'}・可出 {fmtQty(h.availableTotal)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── 這一組的價與量：主件＋替代料 ── */}
        <div className="min-w-0 overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b-2 border-border text-left">
                <th className="px-3 py-2.5 text-[14px] font-bold text-foreground">料號 / 品名 / 廠牌</th>
                <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">可出量（全公司）</th>
                <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">建議售價</th>
                <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">上次賣他</th>
                <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">最近成交</th>
                <th className="px-3 py-2.5 text-[14px] font-bold text-foreground">沒貨怎麼辦</th>
              </tr>
            </thead>
            <tbody>
              {rowsLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-[15px] text-foreground/70">
                    查詢中…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-[15px] text-foreground/70">
                    左邊選一支料，這裡會列出它和它的替代料。
                  </td>
                </tr>
              ) : (
                rows.map((c) => {
                  const avail = totalAvailable(c);
                  const whAvail = Number(c.warehouseAvailable || 0);
                  return (
                    <tr key={c.id} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2.5">
                        <div className="text-[15px] font-medium text-foreground">
                          {c.code}
                          {c.role === 1 ? (
                            <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[12px] text-foreground">主件</span>
                          ) : (
                            <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[12px] text-foreground">替代</span>
                          )}
                        </div>
                        <div className="text-[14px] text-foreground/80">
                          {c.name}・{c.brandName ?? '—'}
                          {c.isOem ? '・正廠' : ''}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div
                          className={`text-[20px] font-bold tabular-nums ${
                            avail > 0 ? 'text-foreground' : 'text-red-500'
                          }`}
                        >
                          {avail.toLocaleString()}
                        </div>
                        {/* 選了客戶才標出貨倉——沒選客戶時那個倉是系統挑的主倉，標了反而誤導 */}
                        {customer && whName ? (
                          <div className="text-[13px] text-foreground/70">
                            {whName} {whAvail.toLocaleString()}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[18px] font-bold tabular-nums text-foreground">
                        {fmtMoney(c.suggestedPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[15px] tabular-nums text-foreground">
                        {c.customerLastAmount ? (
                          <>
                            {fmtMoney(c.customerLastAmount)}
                            <div className="text-[13px] text-foreground/70">{fmtDate(c.customerLastDate)}</div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[15px] tabular-nums text-foreground">
                        {c.partLastAmount ? (
                          <>
                            {fmtMoney(c.partLastAmount)}
                            <div className="text-[13px] text-foreground/70">{fmtDate(c.partLastDate)}</div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {avail > 0 ? (
                          <span className="text-[14px] text-foreground/70">有貨</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToTransfer(c)}
                            className="rounded-md border-2 border-border bg-background px-3 py-1.5 text-[14px] font-medium text-foreground hover:border-primary"
                          >
                            加入調貨詢價
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!customer && rows.length > 0 ? (
        <p className="mt-3 text-[14px] text-foreground/70">
          還沒選客戶——「建議售價」與「上次賣他」要選了客戶才算得出來。上面選一個客戶，整張表會立刻換成他的價。
        </p>
      ) : null}

      {/*
        ⚠️ 建議售價＝進價 ×（1＋客戶等級毛利率）。客戶沒設等級就算不出來。
        ⛔ 這裡不塞一個預設毛利率充數——那等於系統自己編一個售價出來，業務照著報就出事。
        寧可留白並講清楚為什麼，讓人知道要去補等級。
      */}
      {customer && rows.length > 0 && rows.every((r) => !r.suggestedPrice) ? (
        <p className="mt-3 rounded-lg border-2 border-amber-500 bg-amber-500/10 px-4 py-2.5 text-[14px] text-foreground">
          ⚠️ 算不出建議售價：<b>{customer.name}</b> 還沒設定客戶等級。
          建議售價＝進價 ×（1＋等級毛利率），沒有等級就沒有毛利率可以算。
          先到客戶管理把等級補上，這一欄就會有數字。
        </p>
      ) : null}
    </div>
  );
}
