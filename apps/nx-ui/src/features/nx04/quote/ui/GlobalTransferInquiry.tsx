// apps/nx-ui/src/features/nx04/quote/ui/GlobalTransferInquiry.tsx
// F5 全域即時調貨詢價視窗（執行長 2026-07-12 拍板；同日鍵盤流升級 2/7）：
//   F2 報價④選「調貨」／F1 主視窗 Alt+D 加進來的清單在這消化——掛掉客戶電話後、
//   照卡片打給同行、Enter 對選中料記一筆詢價（nx-instant-inquiry → InstantInquiryDialog）。
//   每張卡帶「近30天 N 筆・最低 X（同行）」摘要（口徑=近 30 天、執行長 07/13 拍板）、
//   選中卡展開窗內最近 5 筆明細（比價在 Line 上完成、系統只記錄——S01 關卡二定案、
//   不做並排比價視圖）。Delete 移除、清單存本機（localStorage）。
//   ⚠️ F5 攔掉瀏覽器重新整理（Ctrl+R 仍可用）——鍵盤優先 ERP 的取捨、執行長拍板。
'use client';

import { FileText, HelpCircle, MessageSquareText, PhoneCall, Trash2, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getPartDetail } from '@data/endpoints/nx01/part-search/api/part-search';
import { getQuotePriceHistory } from '@data/endpoints/nx04/quote/api/quote';
import { createQuoteRecord, listInquiryRecords } from '@data/endpoints/nx04/record/api/record';
import type { PartDetailDto } from '@data/types/nx01/part-search';
import type { QuotePriceHistoryRow } from '@data/types/nx04/quote';
import type { InquiryRecord } from '@data/types/nx04/record';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

import { buildQuoteMessage, type MsgOpts } from './quote-message';
import {
  addTransferItems,
  clearTransferItems,
  listTransferItems,
  removeTransferItem,
  transferItemKey,
  TRANSFER_LIST_EVENT,
  type TransferInquiryItem,
} from './transfer-inquiry-store';

const fmtNt = (n: number) =>
  n < 100 && n !== Math.floor(n) ? n.toFixed(2) : n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });

/** 每料詢價摘要＋展開明細（同一份資料、一次抓）。
 *  口徑＝近 30 天（執行長 2026-07-13 拍板、取代初版「近 5 筆」——詢價會過時、太舊的低價帶著誤導）：
 *  摘要筆數與最低價都算 30 天全窗、展開明細取窗內最近 5 筆。 */
type PartInquirySummary = { total: number; recs: InquiryRecord[] };

const SUMMARY_DAYS = 30;
/** 30 天窗上限筆數：電話詢價量遠低於此、視為全窗 */
const SUMMARY_FETCH_SIZE = 50;

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 近 30 天窗（起訖都帶：後端「只填起＝該日當天」、單帶 dateFrom 會變成一天）*/
function summaryDateRange(): { dateFrom: string; dateTo: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - SUMMARY_DAYS);
  return { dateFrom: fmtDate(from), dateTo: fmtDate(to) };
}

// F5 重設計（2026-07-13）：左側 3 站流程軌（詢價→報價→訊息）。階段 2 只做「詢價」站與外殼、
//   報價/訊息站為階段 4 佔位（點了顯施工中）。
const STAGE_DEFS: { n: number; label: string; icon: React.ReactNode }[] = [
  { n: 1, label: '詢價', icon: <PhoneCall className="size-[17px]" /> },
  { n: 2, label: '報價', icon: <FileText className="size-[17px]" /> },
  { n: 3, label: '訊息', icon: <MessageSquareText className="size-[17px]" /> },
];
const secHead = 'mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70';
// F5 調貨報價訊息：單筆調貨（料號＋數量＋報價＋(調貨)＋備註）；F5 不做設定卡、用固定組合
const F5_MSG_OPTS: MsgOpts = { brand: false, baseNo: true, secCode: false, qtyAlways: true, warehouse: true, remark: true };

export function GlobalTransferInquiry() {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // F5 toggle（capture＋preventDefault：攔瀏覽器整頁重新整理）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F5' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, []);

  // F1 主視窗 Alt+D 發 nx-transfer-add（design 層不 import nx04 的解耦範式）→ 這裡入清單
  useEffect(() => {
    const h = (e: Event) => {
      const items = (e as CustomEvent<{ items?: Omit<TransferInquiryItem, 'addedAt'>[] }>).detail?.items;
      if (!items?.length) return;
      const added = addTransferItems(items);
      const total = listTransferItems().length;
      setNotice(added > 0 ? `已加入調貨詢價清單（${added} 顆、清單共 ${total} 顆）——F5 開清單` : '已在調貨詢價清單——F5 開清單');
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = setTimeout(() => setNotice(null), 2600);
    };
    window.addEventListener('nx-transfer-add', h);
    return () => {
      window.removeEventListener('nx-transfer-add', h);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  return (
    <>
      {/* Alt+D 回饋 chip（視窗沒開也看得到有加進去）*/}
      {notice ? (
        <div className="fixed bottom-6 right-6 z-[1200] rounded-lg border border-primary/50 bg-popover px-4 py-2 text-[13px] text-foreground shadow-[0_10px_30px_rgba(0,0,0,0.45)] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="mr-1.5 inline-block size-1.5 rounded-full bg-primary align-middle shadow-[0_0_8px_#02EDAB]" />
          {notice}
        </div>
      ) : null}
      {open ? <TransferInquiryDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function TransferInquiryDialog({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<TransferInquiryItem[]>(() => listTransferItems());
  const [sel, setSel] = useState(0);
  const [stage, setStage] = useState(1); // 1 詢價 / 2 報價 / 3 訊息（階段4）
  const [inqSel, setInqSel] = useState(0); // 副容器：選中的詢價紀錄 index（階段3）
  const [picked, setPicked] = useState<InquiryRecord | null>(null); // 選定進報價的詢價（底價）
  const [quotePrice, setQuotePrice] = useState(''); // 報價站：給客戶售價
  const [quoteQty, setQuoteQty] = useState('1'); // 報價站：數量（預設帶客戶要的量）
  const [quoteRemark, setQuoteRemark] = useState(''); // 報價站：備註
  const [abcdOpen, setAbcdOpen] = useState(false); // 報價站：建議售價 ABCD 展開
  const [abcd, setAbcd] = useState<PartDetailDto | null>(null); // 報價站：ABCD 建議售價
  const [priceHist, setPriceHist] = useState<QuotePriceHistoryRow[] | null>(null); // 報價站：該客戶報價/成交歷史
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  // partId → 摘要（undefined=載入中）
  const [sums, setSums] = useState<Map<string, PartInquirySummary>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);
  const subPanelRef = useRef<HTMLDivElement>(null); // 副容器（詢價）焦點
  const reqSeqRef = useRef(new Map<string, number>());

  const fetchPart = useCallback((partId: string, code: string) => {
    const seq = (reqSeqRef.current.get(partId) ?? 0) + 1;
    reqSeqRef.current.set(partId, seq);
    void (async () => {
      try {
        const r = await listInquiryRecords({ partNo: code, ...summaryDateRange(), pageSize: SUMMARY_FETCH_SIZE });
        if (reqSeqRef.current.get(partId) !== seq) return;
        setSums((m) => new Map(m).set(partId, { total: r.total, recs: r.items }));
      } catch {
        if (reqSeqRef.current.get(partId) !== seq) return;
        setSums((m) => new Map(m).set(partId, { total: 0, recs: [] }));
      }
    })();
  }, []);

  // 開窗即抓全清單摘要（清單是業務待辦、量小）
  useEffect(() => {
    for (const it of items) if (!sums.has(it.partId)) fetchPart(it.partId, it.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // 清單跨視窗同步（F2 ④／F1 Alt+D 加入時）
  useEffect(() => {
    const sync = () => setItems(listTransferItems());
    window.addEventListener(TRANSFER_LIST_EVENT, sync);
    return () => window.removeEventListener(TRANSFER_LIST_EVENT, sync);
  }, []);

  // 詢價存檔後（InstantInquiryDialog 發 nx-inquiry-recorded）：刷新該料摘要 + 焦點回清單
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<{ partId?: string }>).detail;
      const it = items.find((x) => x.partId === d?.partId);
      if (it) fetchPart(it.partId, it.code);
      // 記完詢價（Alt+A）→ 焦點回副容器詢價站，可續選/續加
      setTimeout(() => subPanelRef.current?.focus(), 60);
    };
    window.addEventListener('nx-inquiry-recorded', h);
    return () => window.removeEventListener('nx-inquiry-recorded', h);
  }, [items, fetchPart]);

  useEffect(() => {
    if (sel >= items.length) setSel(Math.max(0, items.length - 1));
  }, [items.length, sel]);

  // 換選料 → 副容器詢價選取歸零、回詢價站
  useEffect(() => {
    setInqSel(0);
    setStage(1);
    setPicked(null);
  }, [sel]);

  // 報價站：載入 ABCD 建議售價 + 該客戶報價/成交歷史（幫業務定售價的參考）
  useEffect(() => {
    const c = items[sel];
    if (stage !== 2 || !c) {
      setAbcd(null);
      setPriceHist(null);
      return;
    }
    let alive = true;
    setAbcd(null);
    setPriceHist(null);
    void getPartDetail(c.partId)
      .then((d) => alive && setAbcd(d))
      .catch(() => {});
    if (c.customerId) {
      void getQuotePriceHistory(c.customerId, c.partId, 12)
        .then((r) => alive && setPriceHist(r.rows))
        .catch(() => alive && setPriceHist([]));
    }
    return () => {
      alive = false;
    };
  }, [stage, sel, items]);

  // 選中卡捲入可視
  useEffect(() => {
    listRef.current?.querySelector(`[data-card="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  useEffect(() => {
    listRef.current?.focus();
  }, []);

  const cur = items[sel];

  const fireInquiry = (it: TransferInquiryItem) => {
    window.dispatchEvent(
      new CustomEvent('nx-instant-inquiry', {
        detail: { partId: it.partId, code: it.code, name: it.name },
      }),
    );
  };

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      e.stopPropagation();
      setHelpOpen((v) => !v);
      return;
    }
    if (items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      // 階段3：Enter 進副容器（詢價站）；不再直接開詢價彈窗（改 Alt+A）
      e.preventDefault();
      if (cur) {
        setInqSel(0);
        setStage(1);
        setTimeout(() => subPanelRef.current?.focus(), 0);
      }
    } else if (e.key === 'Delete') {
      e.preventDefault();
      if (cur) removeTransferItem(cur.customerId, cur.partId);
    }
  };

  // 副容器鍵盤：Esc 逐階段回退（訊息→報價→詢價→待辦）；詢價站 ↑↓/Alt+A/Enter，報價/訊息站交給欄位/按鈕
  const onSubKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!cur) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (stage === 3) setStage(2);
      else if (stage === 2) setStage(1);
      else setTimeout(() => listRef.current?.focus(), 0);
      return;
    }
    if (stage !== 1) return; // 報價/訊息站：其他鍵由欄位/按鈕處理，不跑詢價站邏輯
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      fireInquiry(cur);
      return;
    }
    const recs = sums.get(cur.partId)?.recs ?? [];
    if (recs.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setInqSel((i) => Math.min(recs.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setInqSel((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = recs[Math.min(inqSel, recs.length - 1)];
      if (r) {
        setPicked(r);
        setQuotePrice(''); // 不自動帶成本（避免手滑用成本報出）；成本顯示成底價參考
        setQuoteQty(String(cur.qty || 1));
        setQuoteRemark('');
        setAbcdOpen(false);
        setErr(null);
        setStage(2); // 進報價
      }
    }
  };

  // 結案：存報價紀錄（客戶＋料＋量＋售價＋調貨旗標）→ 移出待辦 → 回列表
  const closeOut = async () => {
    if (!cur || !cur.customerId) return;
    if (quotePrice.trim() === '' || Number(quotePrice) < 0) {
      setErr('請填報價（給客戶售價）');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await createQuoteRecord({
        customerId: cur.customerId,
        partId: cur.partId,
        qty: Number(quoteQty) || cur.qty,
        unitPrice: Number(quotePrice),
        source: 'INSTANT',
        isTransfer: true,
        remark: quoteRemark.trim() || undefined,
      });
      removeTransferItem(cur.customerId, cur.partId); // 結案＝移出缺貨待辦
      setStage(1);
      setPicked(null);
      setTimeout(() => listRef.current?.focus(), 60);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '結案失敗');
    } finally {
      setBusy(false);
    }
  };

  /** 卡片摘要行：近30天 N 筆・最低 X（同行）——掛電話前心裡有底價（最低算 30 天全窗）*/
  const summaryLine = (partId: string) => {
    const s = sums.get(partId);
    if (!s) return <span className="text-[12px] text-muted-foreground/70">詢價紀錄載入中…</span>;
    if (s.total === 0)
      return <span className="text-[12px] text-muted-foreground">近{SUMMARY_DAYS}天沒詢過——Enter 記第一筆</span>;
    const min = s.recs.reduce((a, r) => (Number(r.unitPrice) < Number(a.unitPrice) ? r : a), s.recs[0]);
    return (
      <span className="text-[12px] text-muted-foreground">
        近{SUMMARY_DAYS}天 <span className="font-mono font-semibold text-foreground">{s.total}</span> 筆・最低{' '}
        <span className="font-mono font-semibold text-primary">{fmtNt(Number(min.unitPrice))}</span>
        {min.partnerName ? <>（{min.partnerName}）</> : null}
      </span>
    );
  };

  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel="即時調貨詢價"
      backdropClassName="bg-black/55 backdrop-blur-sm animate-in fade-in duration-200"
      dialogClassName="flex flex-col rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55),0_0_50px_-18px_rgba(232,160,32,0.22)] animate-in fade-in zoom-in-95 duration-200"
      dialogStyle={{ width: 'min(1080px, 96vw)', height: 'min(680px, 92vh)' }}
    >
      <>
        <div className="flex items-center gap-2.5 border-b border-border/40 px-6 py-3">
          <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_#02EDAB]" />
          <PhoneCall className="size-[18px] text-primary" />
          <h2 className="text-[15px] font-semibold tracking-wide">即時調貨詢價</h2>
          <span className="text-[12px] text-muted-foreground">缺貨待辦 {items.length} 筆・詢價紀錄全公司共享</span>
          <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/65">
            F5 · TRANSFER INQUIRY
          </span>
          <button
            type="button"
            onClick={() => setHelpOpen((v) => !v)}
            className="ml-1 rounded-md border border-border/40 bg-background/40 p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            aria-label="引導精靈：快捷鍵說明"
            title="引導精靈（Alt+H）"
          >
            <HelpCircle className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded-md border border-border/40 bg-background/40 p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            aria-label="關閉"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[52px_minmax(360px,1fr)_minmax(340px,1fr)]">
          {/* A：3 站流程軌（詢價→報價→訊息；報價/訊息為階段4）*/}
          <nav className="relative flex flex-col items-center justify-evenly border-r border-border/40 bg-background/30 py-6">
            <span aria-hidden className="absolute bottom-12 left-1/2 top-12 w-[2px] -translate-x-1/2 bg-border/70" />
            {STAGE_DEFS.map((s) => {
              const active = s.n === stage;
              return (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => setStage(s.n)}
                  title={s.n === 1 ? s.label : `${s.label}（階段4 施工中）`}
                  className={`relative z-10 grid size-10 place-items-center rounded-full border-2 transition-colors ${
                    active
                      ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_-2px_rgba(232,160,32,0.6)]'
                      : 'border-border/60 bg-popover text-muted-foreground hover:border-primary/45'
                  }`}
                >
                  {s.icon}
                  <span className="absolute -bottom-1 -right-1 rounded bg-popover px-0.5 font-mono text-[9px] opacity-70">{s.n}</span>
                </button>
              );
            })}
          </nav>

          {/* B 主容器：缺貨待辦列表（每筆＝客戶＋料＋量）*/}
          <section
            ref={listRef}
            tabIndex={0}
            onKeyDown={onKey}
            className="flex min-h-0 flex-col overflow-auto border-r border-border/40 px-5 py-4 outline-none transition-[background-color,box-shadow] focus-within:bg-primary/[0.03] focus-within:ring-1 focus-within:ring-inset focus-within:ring-primary/25"
          >
            <div className={secHead}>缺貨待辦（{items.length}）</div>
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                待辦是空的——F2 報價④出貨倉庫選
                <kbd className="mx-1 rounded border border-border/50 bg-muted/40 px-1 font-mono text-[11px]">調貨</kbd>、
                或 F1 主視窗聚焦缺貨料按
                <kbd className="mx-1 rounded border border-border/50 bg-muted/40 px-1 font-mono text-[11px]">Alt+D</kbd>
                加進來
              </div>
            ) : (
              <div className="space-y-1.5">
                {items.map((it, i) => {
                  const isSel = i === sel;
                  return (
                    <div
                      key={transferItemKey(it.customerId, it.partId)}
                      data-card={i}
                      onClick={() => setSel(i)}
                      className={`cursor-pointer rounded-lg border-2 px-3.5 py-2.5 transition-colors ${
                        isSel ? 'border-primary bg-primary/10' : 'border-border/40 bg-background/40 hover:border-primary/45'
                      }`}
                    >
                      {/* 客戶 + 數量 */}
                      <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                        <UserRound className="size-3.5 shrink-0" />
                        <span className="min-w-0 truncate">
                          {it.customerName
                            ? `${it.customerName}${it.customerCode ? `（${it.customerCode}）` : ''}`
                            : '未指定客戶'}
                        </span>
                        <span className="ml-auto shrink-0 font-mono text-foreground/80">× {it.qty}</span>
                      </div>
                      {/* 料 */}
                      <div className="mt-0.5 flex items-baseline gap-2">
                        <span className="font-mono text-[13.5px] font-semibold text-primary/90">{it.code}</span>
                        <span className="min-w-0 truncate text-[13.5px]">{it.name}</span>
                      </div>
                      {/* 詢價摘要 + 移除 */}
                      <div className="mt-1 flex items-center gap-2">
                        {summaryLine(it.partId)}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTransferItem(it.customerId, it.partId);
                          }}
                          className="ml-auto shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="移除"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* C 副容器：詢價站（↑↓ 選詢價・Alt+A 新增・Enter 帶去報價・Esc 回待辦）*/}
          <aside
            ref={subPanelRef}
            tabIndex={0}
            onKeyDown={onSubKey}
            className="flex min-h-0 flex-col overflow-auto bg-background/20 px-5 py-4 outline-none transition-[background-color,box-shadow] focus-within:bg-primary/[0.03] focus-within:ring-1 focus-within:ring-inset focus-within:ring-primary/25"
          >
            {stage === 2 ? (
              /* 報價站：給客戶售價（底價＝選定同行成本）*/
              <div className="flex min-h-0 flex-col gap-3">
                <div className={secHead}>報價 · {cur?.code}</div>
                {!cur?.customerId ? (
                  <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-3 text-[12.5px] text-amber-600">
                    此筆未指定客戶（F1 通用缺貨）——只能詢價、無法報價結案。Esc 回、Alt+A 續詢價。
                  </div>
                ) : (
                  <>
                    {/* 客戶列 */}
                    <div className="text-[12px] text-muted-foreground">
                      客戶：
                      <span className="font-medium text-foreground">
                        {cur.customerName}
                        {cur.customerCode ? `（${cur.customerCode}）` : ''}
                      </span>
                      　<span className="font-mono">{cur.code}</span> {cur.name}
                    </div>

                    {/* 卡片式屬性列（對齊 F2）：建議售價／調貨成本／報價成交歷史／調貨對象／數量／報價／備註 */}
                    {/* 1 建議售價（點擊展開 ABCD、點格帶入報價）*/}
                    <div className="rounded-lg border-2 border-border/35 bg-secondary/30 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setAbcdOpen((v) => !v)}
                        className="flex w-full items-center justify-between gap-3"
                      >
                        <span className="text-[12.5px] text-foreground/70">建議售價</span>
                        <span className="font-mono text-[13px] text-foreground/70">
                          {abcd === null ? '…' : 'ABCD'} {abcdOpen ? '▴' : '▾'}
                        </span>
                      </button>
                      {abcdOpen ? (
                        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                          {(['A', 'B', 'C', 'D'] as const).map((g) => {
                            const v = abcd?.[`price${g}` as 'priceA' | 'priceB' | 'priceC' | 'priceD'];
                            return (
                              <button
                                key={g}
                                type="button"
                                disabled={!v}
                                onClick={() => v && setQuotePrice(String(v))}
                                className="rounded-md border border-border/50 bg-background/40 px-1.5 py-1 text-center hover:border-primary/50 disabled:opacity-60 disabled:hover:border-border/50"
                              >
                                <div className="text-[10px] text-foreground/55">{g} 價</div>
                                <div className="font-mono text-[13px] font-semibold tabular-nums">
                                  {abcd ? (v ? fmtNt(Number(v)) : '—') : '…'}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    {/* 2 調貨成本（底價、選定同行成本；不可點）*/}
                    <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-border/35 bg-secondary/30 px-3 py-2">
                      <span className="text-[12.5px] text-foreground/70">調貨成本</span>
                      <span className="font-mono text-[13px] tabular-nums text-foreground/95">
                        {picked ? `NT$ ${fmtNt(Number(picked.unitPrice))}（底價）` : '—'}
                      </span>
                    </div>

                    {/* 3 報價/成交歷史（本客戶、點擊帶入報價）*/}
                    <button
                      type="button"
                      onClick={() => {
                        const p = priceHist?.find((h) => h.scope === 'CUSTOMER') ?? priceHist?.[0];
                        if (p) setQuotePrice(String(p.amount));
                      }}
                      className="flex items-center justify-between gap-3 rounded-lg border-2 border-border/35 bg-secondary/30 px-3 py-2 text-left hover:border-primary/45"
                    >
                      <span className="text-[12.5px] text-foreground/70">報價/成交歷史</span>
                      <span className="font-mono text-[13px] tabular-nums text-foreground/95">
                        {(() => {
                          if (priceHist === null) return '…';
                          const p = priceHist.find((h) => h.scope === 'CUSTOMER') ?? priceHist[0];
                          return p ? `${p.kind === 'SALE' ? '成交' : '報價'} NT$ ${fmtNt(Number(p.amount))}` : '—（無前價）';
                        })()}
                      </span>
                    </button>

                    {/* 4 調貨對象（選定同行）*/}
                    <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-border/35 bg-secondary/30 px-3 py-2">
                      <span className="text-[12.5px] text-foreground/70">調貨對象</span>
                      <span className="text-[13px] text-foreground/95">
                        {picked ? (picked.partnerName ?? picked.partnerCode ?? '同行') : '—'}
                      </span>
                    </div>

                    {/* 5 數量 */}
                    <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-border/35 bg-secondary/30 px-3 py-2">
                      <span className="text-[12.5px] text-foreground/70">數量</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={quoteQty}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setQuoteQty(e.target.value)}
                        className="w-24 rounded border bg-background px-2 py-1 text-right font-mono text-sm tabular-nums"
                      />
                    </div>

                    {/* 6 報價（給客戶售價、主色框）*/}
                    <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-primary/45 bg-primary/[0.06] px-3 py-2">
                      <span className="text-[12.5px] text-foreground/70">報價</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        autoFocus
                        value={quotePrice}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setQuotePrice(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setStage(3);
                          }
                        }}
                        placeholder="給客戶售價"
                        className="w-32 rounded border bg-background px-2 py-1 text-right font-mono text-sm font-semibold tabular-nums"
                      />
                    </div>

                    {/* 7 備註 */}
                    <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-border/35 bg-secondary/30 px-3 py-2">
                      <span className="text-[12.5px] text-foreground/70">備註</span>
                      <input
                        type="text"
                        maxLength={100}
                        value={quoteRemark}
                        onChange={(e) => setQuoteRemark(e.target.value)}
                        placeholder="選填"
                        className="w-40 rounded border bg-background px-2 py-1 text-sm"
                      />
                    </div>

                    {err ? <div className="text-xs text-destructive">{err}</div> : null}
                    <div className="mt-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setStage(1);
                          setTimeout(() => subPanelRef.current?.focus(), 0);
                        }}
                        className="rounded border px-3 py-1 text-[12px] hover:border-primary/50"
                      >
                        ← 回詢價
                      </button>
                      <button
                        type="button"
                        onClick={() => setStage(3)}
                        className="rounded bg-primary px-4 py-1.5 text-[12.5px] text-primary-foreground"
                      >
                        下一步：訊息 →
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : stage === 3 && cur ? (
              /* 訊息站：共用 buildQuoteMessage（單筆調貨）＋結案 */
              (() => {
                const msg = buildQuoteMessage(
                  [
                    {
                      name: cur.name,
                      code: cur.code,
                      secCode: null,
                      brand: null,
                      brandName: null,
                      isOem: false,
                      qty: Number(quoteQty) || cur.qty,
                      price: quotePrice || 0,
                      transfer: true,
                      remark: quoteRemark,
                    },
                  ],
                  F5_MSG_OPTS,
                );
                return (
                  <div className="flex min-h-0 flex-1 flex-col gap-3">
                    <div className={secHead}>訊息 · 給 {cur.customerName ?? '客戶'}</div>
                    <textarea
                      readOnly
                      value={msg}
                      className="min-h-0 flex-1 resize-none rounded-md border border-border bg-muted/20 px-3 py-2 font-mono text-[13px] leading-relaxed"
                      style={{ minHeight: '110px' }}
                    />
                    {err ? <div className="text-xs text-destructive">{err}</div> : null}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setStage(2)}
                        className="rounded border px-3 py-1 text-[12px] hover:border-primary/50"
                      >
                        ← 回報價
                      </button>
                      <span className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void navigator.clipboard.writeText(msg)}
                          className="rounded border px-3 py-1.5 text-[12.5px] hover:border-primary/50"
                        >
                          複製
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void closeOut()}
                          className="rounded bg-primary px-4 py-1.5 text-[12.5px] text-primary-foreground disabled:opacity-50"
                        >
                          {busy ? '結案中…' : '存報價＋結案'}
                        </button>
                      </span>
                    </div>
                  </div>
                );
              })()
            ) : !cur ? (
              <div className="text-[12px] text-muted-foreground">左側選一筆待辦、Enter 進來詢價</div>
            ) : (
              <>
                <div className={secHead}>詢價 · {cur.code}</div>
                <button
                  type="button"
                  onClick={() => fireInquiry(cur)}
                  className="mb-3 rounded-lg border border-primary/55 bg-primary/12 px-3 py-1.5 text-[12.5px] font-medium text-primary hover:bg-primary/20"
                >
                  ＋ 新增詢價（Alt+A：同行→量→價→備註）
                </button>
                <div className="mb-2">{summaryLine(cur.partId)}</div>
                {(() => {
                  const s = sums.get(cur.partId);
                  if (!s || s.recs.length === 0)
                    return (
                      <div className="rounded border border-dashed border-border/50 px-3 py-4 text-center text-[12px] text-muted-foreground">
                        還沒詢過——Alt+A 記第一筆
                      </div>
                    );
                  const recs = s.recs.slice(0, 8);
                  return (
                    <div className="space-y-1">
                      <div className="mb-1 text-[11px] text-muted-foreground/60">↑↓ 選一筆・Enter 帶去報價</div>
                      {recs.map((r, ri) => {
                        const on = ri === Math.min(inqSel, recs.length - 1);
                        return (
                          <div
                            key={r.id}
                            onClick={() => setInqSel(ri)}
                            className={`grid cursor-pointer grid-cols-[76px_minmax(0,1fr)_36px_92px] items-baseline gap-x-2 rounded border-2 px-2 py-1 text-[12.5px] ${
                              on ? 'border-primary bg-primary/10' : 'border-transparent hover:border-primary/30'
                            }`}
                          >
                            <span className="font-mono text-[11px] text-muted-foreground">{r.recordDate.slice(0, 10)}</span>
                            <span className="min-w-0 truncate">{r.partnerName ?? r.partnerCode ?? '—'}</span>
                            <span className="text-right font-mono tabular-nums text-foreground/85">{Number(r.qty)}</span>
                            <span className="text-right font-mono font-semibold tabular-nums text-primary">
                              NT$ {fmtNt(Number(r.unitPrice))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            )}
          </aside>
        </div>

        <div className="flex items-center justify-between border-t border-border/35 bg-background/35 px-6 py-2 text-[11px] text-muted-foreground/70">
          <span>待辦：↑↓ 選・Enter 進詢價・Delete 移除｜詢價：↑↓ 選・Alt+A 新增・Enter 進報價・Esc 回｜Alt+H 說明</span>
          {items.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('清空整份調貨詢價清單？（已記的詢價紀錄不受影響）')) clearTransferItems();
              }}
              className="rounded border border-border px-2 py-0.5 text-[11px] hover:border-destructive/50 hover:text-destructive"
            >
              清空清單
            </button>
          ) : null}
        </div>

        {helpOpen ? <TransferHelpOverlay onClose={() => setHelpOpen(false)} /> : null}
      </>
    </FocusLockedDialog>
  );
}

function HelpRow({ k, desc }: { k: string; desc: string }) {
  return (
    <>
      <span className="text-right">
        <kbd className="rounded border border-border/45 bg-background/45 px-1.5 py-px font-mono text-[11px] text-muted-foreground/90">
          {k}
        </kbd>
      </span>
      <span className="text-[13px] text-foreground/90">{desc}</span>
    </>
  );
}

function TransferHelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel="引導精靈：快捷鍵說明"
      backdropClassName="bg-black/55 backdrop-blur-[2px] animate-in fade-in duration-150"
      dialogClassName="flex flex-col rounded-xl border border-border/60 bg-popover text-foreground shadow-[0_18px_50px_rgba(0,0,0,0.5),0_0_36px_-14px_rgba(232,160,32,0.25)] animate-in fade-in zoom-in-95 duration-150"
      dialogStyle={{ width: 'min(520px, 92vw)', maxHeight: 'min(520px, 90vh)' }}
    >
      <>
        <div className="flex items-center gap-2.5 border-b border-border/40 px-5 py-2.5">
          <HelpCircle className="size-4 text-primary" />
          <h3 className="text-sm font-bold tracking-wide">即時調貨詢價・快捷鍵說明</h3>
          <kbd className="rounded border border-primary/50 bg-primary/12 px-1.5 py-px font-mono text-[11px] font-bold text-primary">
            Alt+H
          </kbd>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-md border border-border/40 bg-background/40 p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            aria-label="關閉"
            title="關閉（Esc）"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
          <div className="grid grid-cols-[88px_1fr] items-baseline gap-x-3 gap-y-1.5">
            <HelpRow k="F5" desc="任何頁面開／關本視窗（瀏覽器重新整理改 Ctrl+R）" />
            <HelpRow k="↑↓" desc="待辦：選料；詢價站：選一筆詢價" />
            <HelpRow k="Enter" desc="待辦→進詢價站；詢價站→帶選定詢價去報價（階段4）" />
            <HelpRow k="Alt+A" desc="詢價站新增一筆詢價（同行→量→價→備註）" />
            <HelpRow k="Delete" desc="待辦移除選中料（已記的詢價紀錄不受影響）" />
            <HelpRow k="Esc" desc="詢價站→回待辦；待辦→關視窗" />
            <HelpRow k="Alt+H" desc="本說明（引導精靈通用鍵）" />
          </div>
          <div className="mt-3 rounded border border-border/40 bg-muted/25 px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
            怎麼加料進來：F2 報價④出貨倉庫選「調貨」、或 F1 主視窗聚焦缺貨料按 Alt+D。
            跟誰調、看價還是看到貨速度——在 Line 上決定；系統記住每筆詢價、開同行調貨單時自動帶成本。
          </div>
        </div>
      </>
    </FocusLockedDialog>
  );
}
