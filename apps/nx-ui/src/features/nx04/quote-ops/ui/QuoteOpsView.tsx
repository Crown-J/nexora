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

import { createPartner, getPartner } from '@data/endpoints/shared/master/partner/api/partner';
import type { PartnerDto } from '@data/types/shared/master/partner';

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
  // ── 比價用（執行長 2026-08-01：價格只在「報價」這一段出現）──
  /** 市場行情價（主檔 A 價）：保養廠拿去跟車主講的 */
  marketPrice: string | null;
  /** 公司定價（主檔 B 價）：我們賣他的 */
  listPrice: string | null;
  /** 這個客戶上次買這支多少 */
  customerLastAmount: string | null;
  customerLastDate: string | null;
};

/**
 * ⭐ 全頁一致的輸入框樣式（執行長 2026-08-01 拍板）：
 *    沒在輸入的欄位往後退＝灰底（muted 235）；正在輸入的浮出來＝純白（card 255）＋主色框。
 *    ⛔ 不用粗外框／ring——那個又吵又醜，而且一排欄位全是粗框反而分不出哪個是現在。
 *    ⭐ 這也順便回答了「焦點在哪」：整頁只有一個白底欄位，掃一眼就找到。
 *
 * ⚠️ 聚焦色用 bg-card 不是 bg-background：
 *    這個佈景的 background 是 rgb(238,241,244)、muted 是 rgb(235,238,242)——只差 3 階，
 *    拿 background 當聚焦色等於沒有變化。card 才是純白 rgb(255,255,255)。
 */
const FIELD =
  'rounded-md border border-border bg-muted text-foreground placeholder:text-foreground/50 focus:border-primary focus:bg-card focus:outline-none';

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

/** 基本資料的一欄。⛔ 值不用灰字（規格 §6），只有標籤降一階 */
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[13px] text-foreground/70">{label}</div>
      <div className="text-[15px] font-medium text-foreground">{value || '—'}</div>
    </div>
  );
}

/** 這支料有貨的倉別（⛔ 只列有貨的——零的倉列出來只是雜訊） */
function stockSpots(
  c: QuoteCandidate,
  warehouses: { id: string; code: string; name: string }[],
): { name: string; qty: number }[] {
  return warehouses
    .map((w) => ({ name: w.name, qty: num(c.stockByWh?.[w.id]) }))
    .filter((x) => x.qty > 0)
    .sort((a, b) => b.qty - a.qty);
}

export function QuoteOpsView() {
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [credit, setCredit] = useState<CreditCheckResult | CreditCheckBlocked | null>(null);
  /** 選定客戶後的完整基本資料（下方常駐面板用）*/
  const [profile, setProfile] = useState<PartnerDto | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  /** 建立新客戶的草稿；null＝沒有在建 */
  const [draft, setDraft] = useState<{ name: string; contactName: string; phone: string; mobile: string } | null>(
    null,
  );
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const draftNameRef = useRef<HTMLInputElement>(null);

  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<PartSearchRow[]>([]);
  const [hitIdx, setHitIdx] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [rows, setRows] = useState<QuoteCandidate[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  /** 各倉別（用來把 stockByWh 的 id 翻成看得懂的倉名）*/
  const [warehouses, setWarehouses] = useState<{ id: string; code: string; name: string }[]>([]);

  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const hitListRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLInputElement>(null);
  const reqRef = useRef(0);

  // ⭐ 進來先鎖「對象」（執行長 2026-08-01 訂正）：
  //    流程第一段就是對象，游標卻跳去第二段的搜尋框，等於一開始就把人往下拉。
  //    先選客戶還有一個實質理由——選了才知道他的價、他的預設倉、他欠不欠錢。
  useEffect(() => {
    customerRef.current?.focus();
  }, []);

  // 選了客戶 → 問一次「他現在能不能出貨」，並抓完整基本資料給下方面板
  useEffect(() => {
    if (!customer) {
      setCredit(null);
      setProfile(null);
      return;
    }
    let alive = true;
    setProfileLoading(true);
    checkCredit(customer.id, 0)
      .then((r) => alive && setCredit(r))
      .catch(() => alive && setCredit(null));
    getPartner(customer.id)
      .then((p) => alive && setProfile(p))
      .catch(() => alive && setProfile(null))
      .finally(() => {
        if (alive) setProfileLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [customer]);

  /** 查無客戶 → 就地開一張空白基本資料讓業務填（⛔ 不跳去主檔頁） */
  const startCreate = useCallback((typedName: string) => {
    setCreateErr(null);
    setDraft({ name: typedName, contactName: '', phone: '', mobile: '' });
    setTimeout(() => draftNameRef.current?.focus(), 0);
  }, []);

  const saveNewCustomer = useCallback(async () => {
    if (!draft || !draft.name.trim()) return;
    setCreating(true);
    setCreateErr(null);
    try {
      // partnerType 'C'＝保養廠客戶；代碼留空由後端自動產生
      const created = await createPartner({
        name: draft.name.trim(),
        partnerType: 'C',
        contactName: draft.contactName.trim() || undefined,
        phone: draft.phone.trim() || undefined,
        mobile: draft.mobile.trim() || undefined,
      });
      setDraft(null);
      // 建完直接當成這通電話的對象，⛔ 不用再回去搜一次
      setCustomer({
        id: created.id,
        code: created.code,
        name: created.name,
        defaultWarehouseId: created.defaultWarehouseId ?? null,
        defaultWarehouseName: created.defaultWarehouseName ?? null,
      });
    } catch (e: unknown) {
      setCreateErr(e instanceof Error ? e.message : '建立客戶失敗');
    } finally {
      setCreating(false);
    }
  }, [draft]);

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
      .then((r) => {
        if (!alive) return;
        setRows(r.candidates);
        setWarehouses(r.warehouses ?? []);
      })
      .catch(() => {
        if (!alive) return;
        setRows([]);
        setWarehouses([]);
      })
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
          marketPrice: c.marketPrice,
          listPrice: c.listPrice,
          customerLastAmount: c.customerLastAmount,
          customerLastDate: c.customerLastDate,
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
            <div className="min-w-[320px]">
              {customer ? (
                <div className="flex h-12 items-center gap-2 rounded-lg border-2 border-border bg-card px-3">
                  <span className="text-[16px] font-medium text-foreground">
                    {customer.code} {customer.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomer(null);
                      setDraft(null);
                      setTimeout(() => customerRef.current?.focus(), 0);
                    }}
                    className="ml-auto rounded border border-border px-2 py-0.5 text-[13px] hover:bg-accent"
                  >
                    換一家
                  </button>
                </div>
              ) : (
                <CustomerPicker
                  onPick={setCustomer}
                  // 選定客戶後把游標交給下一段的查料框——⛔ 不要讓人自己找下一步在哪
                  onCommit={() => searchRef.current?.focus()}
                  partnerType="C,O"
                  inputRef={customerRef}
                  onCreateNew={startCreate}
                  big
                  autoFocus
                />
              )}
            </div>
            <p className="text-[14px] text-foreground/70">
              打編號或名稱，↑↓ 選、Enter 帶入；注音首碼按 Alt+Z。查不到會出現「建立客戶」。
            </p>
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

          {/*
            ⭐ 客戶基本資料常駐在下方（執行長 2026-08-01）：
               選到客戶就顯示他是誰、怎麼聯絡、什麼交易條件——業務講電話時要對得上人。
               查不到客戶時同一個位置變成可編輯的建檔表單，存完直接變成這通的對象。
               ⛔ 不跳去主檔頁：跳出去再回來，剛剛打的字跟情境都沒了。
          */}
          <div className="mt-4 rounded-lg border-2 border-border bg-card p-4">
            {draft ? (
              <div>
                <div className="mb-3 text-[15px] font-bold text-foreground">建立客戶（代碼由系統自動給）</div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block">
                    <span className="mb-1 block text-[14px] font-medium text-foreground">客戶名稱（必填）</span>
                    <input
                      ref={draftNameRef}
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className={`h-11 w-full px-2 text-[15px] ${FIELD}`}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[14px] font-medium text-foreground">聯絡人</span>
                    <input
                      value={draft.contactName}
                      onChange={(e) => setDraft({ ...draft, contactName: e.target.value })}
                      className={`h-11 w-full px-2 text-[15px] ${FIELD}`}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[14px] font-medium text-foreground">電話</span>
                    <input
                      value={draft.phone}
                      onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                      className={`h-11 w-full px-2 text-[15px] ${FIELD}`}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[14px] font-medium text-foreground">手機</span>
                    <input
                      value={draft.mobile}
                      onChange={(e) => setDraft({ ...draft, mobile: e.target.value })}
                      className={`h-11 w-full px-2 text-[15px] ${FIELD}`}
                    />
                  </label>
                </div>
                {createErr ? (
                  <div className="mt-3 rounded-md border-2 border-red-500 bg-red-500/10 px-3 py-2 text-[15px] text-foreground">
                    {createErr}
                  </div>
                ) : null}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!draft.name.trim() || creating}
                    onClick={() => void saveNewCustomer()}
                    className="h-11 rounded-md border-2 border-primary bg-primary/10 px-5 text-[15px] font-bold text-foreground hover:bg-primary/20 disabled:border-border disabled:bg-transparent disabled:opacity-50"
                  >
                    {creating ? '存檔中…' : '存檔並帶入'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(null);
                      setTimeout(() => customerRef.current?.focus(), 0);
                    }}
                    className="h-11 rounded-md border-2 border-border px-4 text-[15px] text-foreground hover:bg-accent"
                  >
                    取消
                  </button>
                  <span className="text-[14px] text-foreground/70">
                    ⚠️ 只建最少欄位，其餘（等級、付款條件、倉別）之後到客戶管理補。
                  </span>
                </div>
              </div>
            ) : profileLoading ? (
              <div className="text-[15px] text-foreground/70">讀取客戶資料中…</div>
            ) : profile ? (
              <div>
                <div className="mb-3 text-[15px] font-bold text-foreground">客戶基本資料</div>
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="編號" value={profile.code} />
                  <Field label="名稱" value={profile.name} />
                  <Field label="聯絡人" value={profile.contactName} />
                  <Field label="電話" value={profile.phone ?? profile.mobile} />
                  <Field label="統一編號" value={profile.taxId} />
                  <Field label="客戶等級" value={profile.customerGradeName ?? profile.customerGradeCode} />
                  <Field label="付款條件" value={profile.paymentTermDomestic} />
                  <Field label="預設出貨倉" value={profile.defaultWarehouseName} />
                </div>
              </div>
            ) : (
              <div className="text-[15px] text-foreground/70">
                還沒選客戶。選定之後這裡會顯示他的基本資料；查不到的話會變成建檔表單。
              </div>
            )}
          </div>
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
              className={`h-14 w-full rounded-lg pl-12 pr-4 text-[17px] ${FIELD}`}
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
      // ⛔ 不掛 blocked——看庫存是過程不是存檔條件
      content: (
        <div>
          {/*
            ⭐ 這一段回答兩個問題（執行長 2026-08-01 訂正）：
                「這支料的通用件有哪些？」「在哪些倉位？」
            ⛔ 這裡不出現任何價格——比價是下一段「報價」的事。
               混在一起會讓業務在還沒確定要出哪一支料的時候就先看價、先想折扣。
          */}
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b-2 border-border text-left">
                  <th className="px-3 py-2.5 text-[14px] font-bold text-foreground">料號 / 品名 / 廠牌</th>
                  <th className="px-3 py-2.5 text-[14px] font-bold text-foreground">通用件</th>
                  <th className="px-3 py-2.5 text-[14px] font-bold text-foreground">在哪些倉位</th>
                  <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">
                    可出量
                    <div className="text-[12px] font-normal text-foreground/70">全公司</div>
                  </th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rowsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-[15px] text-foreground/70">
                      查詢中…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-[15px] text-foreground/70">
                      上一段選一支料，這裡列出它和它的通用件、各在哪個倉。
                    </td>
                  </tr>
                ) : (
                  rows.map((c) => {
                    const avail = totalAvailable(c);
                    const spots = stockSpots(c, warehouses);
                    const added = lines.some((l) => l.partId === c.id);
                    return (
                      <tr key={c.id} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2.5">
                          <div className="text-[15px] font-medium text-foreground">{c.code}</div>
                          <div className="text-[14px] text-foreground/80">
                            {c.name}・{c.brandName ?? '—'}
                            {c.isOem ? '・正廠' : ''}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {c.role === 1 ? (
                            <span className="rounded bg-primary/15 px-2 py-1 text-[14px] font-medium text-foreground">
                              客戶問的這支
                            </span>
                          ) : (
                            <span className="rounded border-2 border-border px-2 py-1 text-[14px] font-medium text-foreground">
                              可代用
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {spots.length === 0 ? (
                            <span className="text-[15px] font-bold text-red-500">都沒貨</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {spots.map((s) => (
                                <span
                                  key={s.name}
                                  className="rounded-md border-2 border-border px-2 py-1 text-[14px] text-foreground"
                                >
                                  {s.name}{' '}
                                  <b className="tabular-nums">{s.qty.toLocaleString()}</b>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right text-[20px] font-bold tabular-nums ${
                            avail > 0 ? 'text-foreground' : 'text-red-500'
                          }`}
                        >
                          {avail.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            disabled={added}
                            onClick={() => addLine(c)}
                            className="rounded-md border-2 border-border bg-background px-3 py-1.5 text-[14px] font-medium text-foreground hover:border-primary disabled:opacity-50 disabled:hover:border-border"
                          >
                            {added ? '已加入' : '拿這支報'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      key: 'quote',
      label: '報價',
      blocked: validLines.length > 0 ? undefined : '還沒有可報的項目（要有數量與價格）',
      content: (
        <div>
          {/*
            ⭐ 比價集中在這一段（執行長 2026-08-01 訂正）：
               三個參考價擺在報價欄旁邊——市場行情（保養廠對車主講的）、
               公司定價（我們的價）、上次賣他（議價依據）。
               ⛔ 上一段「檢查庫存」刻意不放價，那裡只決定「要出哪一支」。
          */}
          <div className="overflow-x-auto rounded-lg border-2 border-border bg-card">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="border-b-2 border-border text-left">
                  <th className="px-3 py-2.5 text-[14px] font-bold text-foreground">料號 / 品名</th>
                  <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">
                    市場行情價
                    <div className="text-[12px] font-normal text-foreground/70">保養廠對車主</div>
                  </th>
                  <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">
                    公司定價
                    <div className="text-[12px] font-normal text-foreground/70">我們賣他</div>
                  </th>
                  <th className="px-3 py-2.5 text-right text-[14px] font-bold text-foreground">上次賣他</th>
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
                    <td colSpan={9} className="px-3 py-6 text-[15px] text-foreground/70">
                      上一段按「拿這支報」把料帶下來。
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
                      <td className="px-3 py-2.5 text-right text-[17px] font-bold tabular-nums text-foreground">
                        {money(l.marketPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[17px] font-bold tabular-nums text-foreground">
                        {money(l.listPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[15px] tabular-nums text-foreground">
                        {l.customerLastAmount ? (
                          <>
                            {money(l.customerLastAmount)}
                            <div className="text-[13px] text-foreground/70">
                              {l.customerLastDate ? l.customerLastDate.slice(0, 10) : ''}
                            </div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          value={l.qty}
                          onChange={(e) => patchLine(l.partId, { qty: e.target.value })}
                          inputMode="decimal"
                          aria-label={`${l.code} 數量`}
                          className={`h-10 w-24 px-2 text-right text-[16px] tabular-nums ${FIELD}`}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          value={l.unitPrice}
                          onChange={(e) => patchLine(l.partId, { unitPrice: e.target.value })}
                          inputMode="decimal"
                          aria-label={`${l.code} 報價`}
                          className={`h-10 w-28 px-2 text-right text-[16px] tabular-nums ${FIELD}`}
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
                          className={`h-10 w-full min-w-[120px] px-2 text-[15px] ${FIELD}`}
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
      // 九宮格是「報價作業 ▸ 建立報價」，落地頁就該叫建立報價（執行長 2026-08-01）
      title="建立報價"
      sections={sections}
      onCancel={resetAll}
      onSubmit={() => void save()}
      submitLabel={saving ? '存檔中…' : `存成報價紀錄（${validLines.length}）`}
    />
  );
}
