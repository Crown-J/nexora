// apps/nx-ui/src/features/nx04/quote-ops/ui/QuoteOpsView.tsx
//
// 報價作業（銷售第 1 格）—— v3.0.0 一頁式，取代舊的「即時報價」浮層工作站。
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §2.1 §3.3 §6 §7
//
// ⭐ 為什麼這是第 1 格（執行長 2026-08-01）：
//    「客戶打進來就是來詢價，所以要做的就是直接報價。」
//    查料、看有沒有貨、看兩個價——那些不是另一件事，是報價當下的動作，全部收在這一頁。
//    所以九宮格⛔ 沒有「查價查貨」那一格了。
//
// ⭐ 沿用舊浮層工作站的五階段流程（執行長 2026-08-01 訂正）：
//      對象 → 搜尋 → 檢查庫存 → 報價 → 發送訊息
//    形狀不變、使用者已經認得，⛔ 改掉的只有「它是彈窗」這件事。
//    流程軌從浮層左欄變成頁面左欄常駐（FlowTemplate），內容一頁到底、Alt+1~5 跳段。
//    ⛔ 不是分步精靈——五段同時都在，往下滾就看得到全貌、回頭改只是往上滾。
//
// ⚠️ 存的是**報價紀錄**（source='INSTANT'），⛔ 不是正式報價單——
//    沿用舊站的業務行為（見 QuoteWorkspace.save()）：電話報價量大，不是每通都要開正式單。
//
// ⚠️ 訊息文字沿用共用產生器 buildQuoteMessage（與舊站、調貨詢價同一支），
//    ⛔ 不另外發明格式，否則客戶收到的訊息會因為從哪裡報而長不一樣。

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';

import {
  checkCredit,
  type CreditCheckBlocked,
  type CreditCheckResult,
} from '@data/endpoints/nx04/credit-guard/api/credit-guard';
import { getQuoteCandidates } from '@data/endpoints/nx04/quote/api/quote';
import { createQuoteRecord } from '@data/endpoints/nx04/record/api/record';
import { quickSearchParts } from '@data/endpoints/nx01/part-search/api/part-search';
import type { PartSearchRow } from '@data/types/nx01/part-search';
import type { QuoteCandidate } from '@data/types/nx04/quote';
import { FlowTemplate, type FlowSection } from '@design/templates/FlowTemplate';

import { CustomerPicker, type PickedCustomer } from '../../quote/ui/CustomerPicker';
import { buildQuoteMessage, defaultMsgOpts } from '../../quote/ui/quote-message';

/** 這通電話已經報出去的一行 */
type QuoteLine = {
  partId: string;
  code: string;
  name: string;
  secCode: string | null;
  brandCode: string | null;
  brandName: string | null;
  isOem: boolean;
  qty: string;
  unitPrice: string;
  remark: string;
  /** 加入當下的可出量，只用來提醒「報了但沒貨」*/
  available: number;
};

function num(v: string | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : String(v);
}

/** 全公司可出量＝各倉相加（與命中清單同口徑，⛔ 不用單倉的 warehouseAvailable）*/
function totalAvailable(c: QuoteCandidate): number {
  return Object.values(c.stockByWh ?? {}).reduce((s, v) => s + num(v), 0);
}

export function QuoteOpsView() {
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [credit, setCredit] = useState<CreditCheckResult | CreditCheckBlocked | null>(null);

  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<PartSearchRow[]>([]);
  const [hitIdx, setHitIdx] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [rows, setRows] = useState<QuoteCandidate[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const hitListRef = useRef<HTMLDivElement>(null);
  const reqRef = useRef(0);

  // 規格 §3.3：進來游標就在搜尋框——客戶隨時來電就能直接打料號
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

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

  const runSearch = useCallback(async () => {
    const kw = term.trim();
    if (!kw) return;
    setSearching(true);
    setSearched(true);
    const seq = ++reqRef.current;
    try {
      // 料號、品名、車型一起搜——業務講得出哪個就用哪個
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

  const currentPartId = hits[hitIdx]?.id ?? null;
  useEffect(() => {
    if (!currentPartId) {
      setRows([]);
      return;
    }
    let alive = true;
    setRowsLoading(true);
    getQuoteCandidates(currentPartId, customer?.id, customer?.defaultWarehouseId ?? undefined)
      .then((r) => alive && setRows(r.candidates))
      .catch(() => alive && setRows([]))
      .finally(() => {
        if (alive) setRowsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [currentPartId, customer]);

  /** 加進報價：單價預帶公司定價，⛔ 不帶市場行情價（那是給保養廠對車主講的） */
  const addLine = useCallback((c: QuoteCandidate) => {
    setSavedMsg(null);
    setLines((prev) => {
      if (prev.some((l) => l.partId === c.id)) return prev; // 同一支料不重複加
      return [
        ...prev,
        {
          partId: c.id,
          code: c.code,
          name: c.name,
          secCode: c.secCode,
          brandCode: c.brandCode,
          brandName: c.brandName,
          isOem: c.isOem,
          qty: '1',
          unitPrice: c.listPrice ?? '',
          remark: '',
          available: totalAvailable(c),
        },
      ];
    });
  }, []);

  const patchLine = useCallback((partId: string, patch: Partial<QuoteLine>) => {
    setLines((prev) => prev.map((l) => (l.partId === partId ? { ...l, ...patch } : l)));
  }, []);

  const removeLine = useCallback((partId: string) => {
    setLines((prev) => prev.filter((l) => l.partId !== partId));
  }, []);

  /** 有數量也有價的才算數（對齊舊站 validLines 口徑） */
  const validLines = useMemo(
    () => lines.filter((l) => num(l.qty) > 0 && num(l.unitPrice) > 0),
    [lines],
  );
  const total = useMemo(
    () => validLines.reduce((s, l) => s + num(l.qty) * num(l.unitPrice), 0),
    [validLines],
  );

  /** 給客戶的訊息——沿用共用產生器，⛔ 不自己排版 */
  const msgText = useMemo(
    () =>
      buildQuoteMessage(
        validLines.map((l) => ({
          name: l.name,
          code: l.code,
          secCode: l.secCode,
          brand: l.brandCode,
          brandName: l.brandName,
          isOem: l.isOem,
          qty: l.qty,
          price: l.unitPrice,
          remark: l.remark || undefined,
        })),
        defaultMsgOpts,
        customer?.defaultWarehouseName,
      ),
    [validLines, customer],
  );

  useEffect(() => {
    setCopied(false);
  }, [msgText]);

  const resetAll = useCallback(() => {
    setLines([]);
    setTerm('');
    setHits([]);
    setRows([]);
    setSearched(false);
    setErrMsg(null);
    searchRef.current?.focus();
  }, []);

  const save = useCallback(async () => {
    if (!customer || validLines.length === 0) return;
    // §2.1 允許的浮層只有「確認對話」這一種——單一問句、兩個按鈕
    if (!window.confirm(`把這 ${validLines.length} 筆報價存進 ${customer.name} 的報價紀錄？`)) return;
    setSaving(true);
    setErrMsg(null);
    try {
      for (const l of validLines) {
        await createQuoteRecord({
          customerId: customer.id,
          partId: l.partId,
          qty: num(l.qty),
          unitPrice: num(l.unitPrice),
          warehouseId: customer.defaultWarehouseId ?? undefined,
          source: 'INSTANT',
          remark: l.remark.trim() || undefined,
        });
      }
      setSavedMsg(`已存 ${validLines.length} 筆報價紀錄。`);
      // 存完清空、準備接下一通——⛔ 不留舊資料，避免報到別家客戶身上
      resetAll();
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : '報價紀錄儲存失敗');
    } finally {
      setSaving(false);
    }
  }, [customer, validLines, resetAll]);

  // ───────────────────────────── 五個階段
  const sections: FlowSection[] = [
    {
      key: 'customer',
      label: '對象',
      blocked: customer ? undefined : '還沒選客戶（散客可先跳過，存檔前要補）',
      content: (
        <div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[300px]">
              {customer ? (
                <div className="flex h-12 items-center gap-2 rounded-lg border-2 border-border bg-card px-3">
                  <span className="text-[16px] font-medium text-foreground">
                    {customer.code} {customer.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustomer(null)}
                    className="ml-auto rounded border border-border px-2 py-0.5 text-[13px] hover:bg-accent"
                  >
                    換一家
                  </button>
                </div>
              ) : (
                <CustomerPicker
                  onPick={setCustomer}
                  onCommit={() => searchRef.current?.focus()}
                  partnerType="C,O"
                />
              )}
            </div>
            <p className="text-[14px] text-foreground/70">散客／還沒決定也可以先查料。</p>
          </div>

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
        </div>
      ),
    },
    {
      key: 'search',
      label: '搜尋',
      // ⛔ 這一段不掛 blocked：查料是過程不是條件，
      //    存檔只需要「有客戶」＋「有可報的項目」。掛了會變成查完料還得留著搜尋結果才准存檔。
      content: (
        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground" />
            <input
              ref={searchRef}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void runSearch();
                  setTimeout(() => hitListRef.current?.focus(), 0);
                }
              }}
              placeholder="料號／品名／車型"
              aria-label="查料"
              className="h-14 w-full rounded-lg border-2 border-border bg-card pl-12 pr-4 text-[17px] text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none"
            />
          </div>

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
            className="mt-3 rounded-lg border border-border bg-card p-2 focus:outline focus:outline-2 focus:outline-primary"
          >
            <div className="px-1 pb-2 text-[14px] font-bold text-foreground">
              找到 {hits.length} 筆{searching ? '（查詢中…）' : ''}
            </div>
            {hits.length === 0 ? (
              <div className="px-1 py-3 text-[14px] text-foreground/70">
                {searched && !searching ? '沒有符合的零件。' : '打料號、品名或車型，按 Enter。'}
              </div>
            ) : (
              <div className="grid max-h-[30vh] gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                {hits.map((h, i) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setHitIdx(i)}
                    className={`rounded-md px-2 py-2 text-left ${
                      i === hitIdx ? 'bg-primary/15 ring-2 ring-primary' : 'hover:bg-foreground/[0.05]'
                    }`}
                  >
                    <div className="text-[15px] font-medium text-foreground">{h.code}</div>
                    <div className="text-[14px] text-foreground/80">{h.name}</div>
                    <div className="text-[13px] text-foreground/70">
                      {h.brandName ?? '—'}・可出 {num(h.availableTotal).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'stock',
      label: '檢查庫存',
      // ⛔ 同上，不掛 blocked——看庫存是過程不是存檔條件
      content: (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b-2 border-border text-left">
                <th className="px-3 py-2.5 text-[14px] font-bold text-foreground">料號 / 品名 / 廠牌</th>
                <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">可出量</th>
                <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">
                  市場行情價
                  <div className="text-[12px] font-normal text-foreground/70">保養廠對車主</div>
                </th>
                <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">
                  公司定價
                  <div className="text-[12px] font-normal text-foreground/70">我們賣他</div>
                </th>
                <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">上次賣他</th>
                <th className="px-3 py-2.5" />
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
                    上一段選一支料，這裡列出它和它的替代料。
                  </td>
                </tr>
              ) : (
                rows.map((c) => {
                  const avail = totalAvailable(c);
                  const added = lines.some((l) => l.partId === c.id);
                  return (
                    <tr key={c.id} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2.5">
                        <div className="text-[15px] font-medium text-foreground">
                          {c.code}
                          {c.role === 1 ? (
                            <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[12px] text-foreground">
                              主件
                            </span>
                          ) : (
                            <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[12px] text-foreground">
                              替代
                            </span>
                          )}
                        </div>
                        <div className="text-[14px] text-foreground/80">
                          {c.name}・{c.brandName ?? '—'}
                          {c.isOem ? '・正廠' : ''}
                        </div>
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right text-[20px] font-bold tabular-nums ${
                          avail > 0 ? 'text-foreground' : 'text-red-500'
                        }`}
                      >
                        {avail.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[18px] font-bold tabular-nums text-foreground">
                        {money(c.marketPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[18px] font-bold tabular-nums text-foreground">
                        {money(c.listPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[15px] tabular-nums text-foreground">
                        {c.customerLastAmount ? money(c.customerLastAmount) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          disabled={added}
                          onClick={() => addLine(c)}
                          className="rounded-md border-2 border-border bg-background px-3 py-1.5 text-[14px] font-medium text-foreground hover:border-primary disabled:opacity-50 disabled:hover:border-border"
                        >
                          {added ? '已加入' : '加進報價'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ),
    },
    {
      key: 'quote',
      label: '報價',
      blocked: validLines.length > 0 ? undefined : '還沒有可報的項目（要有數量與價格）',
      content: (
        <div>
          <div className="overflow-x-auto rounded-lg border-2 border-border bg-card">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr className="border-b-2 border-border text-left">
                  <th className="px-3 py-2.5 text-[14px] font-bold text-foreground">料號 / 品名</th>
                  <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">數量</th>
                  <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">報價</th>
                  <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">小計</th>
                  <th className="px-3 py-2.5 text-[14px] font-bold text-foreground">備註</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-[15px] text-foreground/70">
                      上一段按「加進報價」把料帶下來。
                    </td>
                  </tr>
                ) : (
                  lines.map((l) => (
                    <tr key={l.partId} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2.5">
                        <div className="text-[15px] font-medium text-foreground">{l.code}</div>
                        <div className="text-[14px] text-foreground/80">
                          {l.name}
                          {l.available <= 0 ? (
                            <span className="ml-2 font-bold text-red-500">目前沒貨</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          value={l.qty}
                          onChange={(e) => patchLine(l.partId, { qty: e.target.value })}
                          inputMode="decimal"
                          aria-label={`${l.code} 數量`}
                          className="h-10 w-24 rounded-md border-2 border-border bg-background px-2 text-right text-[16px] tabular-nums text-foreground focus:border-primary focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          value={l.unitPrice}
                          onChange={(e) => patchLine(l.partId, { unitPrice: e.target.value })}
                          inputMode="decimal"
                          aria-label={`${l.code} 報價`}
                          className="h-10 w-28 rounded-md border-2 border-border bg-background px-2 text-right text-[16px] tabular-nums text-foreground focus:border-primary focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right text-[17px] font-bold tabular-nums text-foreground">
                        {(num(l.qty) * num(l.unitPrice)).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          value={l.remark}
                          onChange={(e) => patchLine(l.partId, { remark: e.target.value })}
                          placeholder="選填"
                          aria-label={`${l.code} 備註`}
                          className="h-10 w-full min-w-[120px] rounded-md border-2 border-border bg-background px-2 text-[15px] text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => removeLine(l.partId)}
                          aria-label={`移除 ${l.code}`}
                          title="移除"
                          className="rounded-md border-2 border-border p-2 text-foreground hover:border-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-right text-[16px] font-medium text-foreground">
            合計 <span className="text-[26px] font-bold tabular-nums">{total.toLocaleString()}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'message',
      label: '發送訊息',
      content: (
        <div>
          <textarea
            readOnly
            value={msgText || '（還沒有可發送的報價——回「報價」那一段填數量與價格）'}
            aria-label="給客戶的報價訊息"
            rows={10}
            className="w-full rounded-lg border-2 border-border bg-card p-3 text-[15px] leading-relaxed text-foreground"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!msgText}
              onClick={() => {
                void navigator.clipboard.writeText(msgText).then(() => setCopied(true));
              }}
              className="h-11 rounded-md border-2 border-border bg-card px-5 text-[15px] font-medium text-foreground hover:bg-accent disabled:opacity-50"
            >
              複製訊息
            </button>
            {copied ? <span className="text-[15px] font-bold text-foreground">已複製</span> : null}
            <span className="text-[14px] text-foreground/70">
              複製後貼到 LINE 給客戶。⚠️ 散客可以只複製訊息不存檔；要存報價紀錄才需要客戶。
            </span>
          </div>

          {savedMsg ? (
            <div className="mt-3 rounded-lg border-2 border-border bg-card px-4 py-2.5 text-[15px] font-bold text-foreground">
              {savedMsg}
            </div>
          ) : null}
          {errMsg ? (
            <div className="mt-3 rounded-lg border-2 border-red-500 bg-red-500/10 px-4 py-2.5 text-[15px] text-foreground">
              {errMsg}
            </div>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <FlowTemplate
      title="報價作業"
      sections={sections}
      onCancel={resetAll}
      onSubmit={() => void save()}
      submitLabel={saving ? '存檔中…' : `存成報價紀錄（${validLines.length}）`}
    />
  );
}
