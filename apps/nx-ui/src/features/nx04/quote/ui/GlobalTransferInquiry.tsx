// apps/nx-ui/src/features/nx04/quote/ui/GlobalTransferInquiry.tsx
// F5 全域即時調貨詢價視窗（執行長 2026-07-12 拍板；同日鍵盤流升級 2/7）：
//   F2 報價④選「調貨」／F1 主視窗 Alt+D 加進來的清單在這消化——掛掉客戶電話後、
//   照卡片打給同行、Enter 對選中料記一筆詢價（nx-instant-inquiry → InstantInquiryDialog）。
//   每張卡帶「近30天 N 筆・最低 X（同行）」摘要（口徑=近 30 天、執行長 07/13 拍板）、
//   選中卡展開窗內最近 5 筆明細（比價在 Line 上完成、系統只記錄——S01 關卡二定案、
//   不做並排比價視圖）。Delete 移除、清單存本機（localStorage）。
//   ⚠️ F5 攔掉瀏覽器重新整理（Ctrl+R 仍可用）——鍵盤優先 ERP 的取捨、執行長拍板。
'use client';

import { ArrowLeftRight, FileText, HelpCircle, MessageSquareText, PackagePlus, PhoneCall, Trash2, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getPartDetail } from '@data/endpoints/nx01/part-search/api/part-search';
import { getQuotePriceHistory } from '@data/endpoints/nx04/quote/api/quote';
import { createQuoteRecord, listInquiryRecords } from '@data/endpoints/nx04/record/api/record';
import type { PartDetailDto } from '@data/types/nx01/part-search';
import type { QuotePriceHistoryRow } from '@data/types/nx04/quote';
import type { InquiryRecord } from '@data/types/nx04/record';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

import { PartPicker } from './PartPicker';
import { buildQuoteMessage, MSG_OPT_DEFS, type MsgOpts } from './quote-message';
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

// F5 重設計（2026-07-14 執行長拍板五站）：詢價→換料→建檔→報價→訊息。
//   換料＝同行報的可能是別的牌（如問 BOSCH 對方只有 HEGNST）→ 從主檔選 B 料替換；
//   建檔＝B 料沒建檔時：有權限（SYSADMIN/OWNER）快速建檔、無權限產通知文字給建檔人員。
//   詢價紀錄留在 A（問的是基準料）；報價/訊息/結案走換料後的生效料號。
const STAGE_DEFS: { n: number; label: string; icon: React.ReactNode }[] = [
  { n: 1, label: '詢價', icon: <PhoneCall className="size-[17px]" /> },
  { n: 2, label: '換料', icon: <ArrowLeftRight className="size-[17px]" /> },
  { n: 3, label: '建檔', icon: <PackagePlus className="size-[17px]" /> },
  { n: 4, label: '報價', icon: <FileText className="size-[17px]" /> },
  { n: 5, label: '訊息', icon: <MessageSquareText className="size-[17px]" /> },
];
// 換料結果（生效料號）：null＝用原料號 A
type SwapPart = { id: string; code: string; name: string; secCode: string | null; brandName: string | null; isOem: boolean };
const secHead = 'mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70';
// F5 調貨報價訊息預設選項（訊息站設定卡可調、存本機、與 F2 分開記）
const F5_MSG_OPTS: MsgOpts = { brand: false, baseNo: true, secCode: false, qtyAlways: true, warehouse: true, remark: true };
const F5_MSG_OPTS_KEY = 'nx-f5-msg-opts';
// 報價站卡片列（對齊 F2 屬性面板：↑↓ 選、Enter 展開/編輯）；調貨成本/調貨對象純顯示不展開
const Q_ROWS = ['建議售價', '調貨成本', '報價/成交歷史', '調貨對象', '數量', '報價', '備註'] as const;
const QR_SUGGESTED = 0;
const QR_COST = 1;
const QR_HIST = 2;
const QR_PARTNER = 3;
const QR_QTY = 4;
const QR_PRICE = 5;
const QR_REMARK = 6;

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
  const [stage, setStage] = useState(1); // 1 詢價 / 2 換料 / 3 建檔 / 4 報價 / 5 訊息
  const [inqSel, setInqSel] = useState(0); // 副容器：選中的詢價紀錄 index
  const [picked, setPicked] = useState<InquiryRecord | null>(null); // 選定進報價的詢價（底價）
  const [swapPart, setSwapPart] = useState<SwapPart | null>(null); // 換料結果：null＝用原料號 A
  const [quotePrice, setQuotePrice] = useState(''); // 報價站：給客戶售價
  const [quoteQty, setQuoteQty] = useState('1'); // 報價站：數量（預設帶客戶要的量）
  const [quoteRemark, setQuoteRemark] = useState(''); // 報價站：備註
  const [abcd, setAbcd] = useState<PartDetailDto | null>(null); // 報價站：ABCD 建議售價
  const [priceHist, setPriceHist] = useState<QuotePriceHistoryRow[] | null>(null); // 報價站：該客戶報價/成交歷史
  // 報價站卡片列鍵盤流（對齊 F2）：↑↓ 選卡、Enter 展開/編輯
  const [qSel, setQSel] = useState(0);
  const [qOpen, setQOpen] = useState<null | 'abcd' | 'hist'>(null);
  const [qEdit, setQEdit] = useState<null | 'qty' | 'price' | 'remark'>(null);
  const [qHistSel, setQHistSel] = useState(0);
  const qEditRef = useRef<HTMLInputElement>(null);
  // 訊息站（對齊 F2 stage5）：左訊息框、右設定卡（↑↓ 選、Space 開關、Enter 存檔結案、Alt+E 編輯訊息）
  const [msgOpts, setMsgOpts] = useState<MsgOpts>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(F5_MSG_OPTS_KEY) : null;
      if (raw) return { ...F5_MSG_OPTS, ...(JSON.parse(raw) as Partial<MsgOpts>) };
    } catch {
      /* 走預設 */
    }
    return F5_MSG_OPTS;
  });
  const [optSel, setOptSel] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [msgDraft, setMsgDraft] = useState<string | null>(null);
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const setOpt = (patch: Partial<MsgOpts>) =>
    setMsgOpts((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(F5_MSG_OPTS_KEY, JSON.stringify(next));
      } catch {
        /* 存不了不擋 */
      }
      return next;
    });
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

  // 全域鍵（開窗時、對齊 F2 範式）：Alt+1~5 切站、Alt+S 進訊息、Alt+E 編輯訊息、Alt+H 說明
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key.toLowerCase();
      if (!['1', '2', '3', '4', '5', 's', 'h', 'e'].includes(k)) return;
      if (k === 'e' && stage !== 5) return; // Alt+E 只在訊息站
      e.preventDefault();
      e.stopPropagation();
      if (k === 'h') {
        setHelpOpen((v) => !v);
        return;
      }
      if (k === 'e') {
        setEditMode((v) => {
          const next = !v;
          setTimeout(() => (next ? msgRef.current?.focus() : subPanelRef.current?.focus()), 0);
          return next;
        });
        return;
      }
      const n = k === 's' ? 5 : Number(k);
      setEditMode(false);
      if (n === 1) {
        setStage(1);
        setTimeout(() => listRef.current?.focus(), 0);
      } else {
        if (n === 4) {
          setQSel(0);
          setQOpen(null);
          setQEdit(null);
        }
        setStage(n);
        setTimeout(() => subPanelRef.current?.focus(), 0);
      }
    };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, [stage]);

  useEffect(() => {
    if (sel >= items.length) setSel(Math.max(0, items.length - 1));
  }, [items.length, sel]);

  // 換選料 → 副容器詢價選取歸零、回詢價站
  useEffect(() => {
    setInqSel(0);
    setStage(1);
    setPicked(null);
    setSwapPart(null);
    setEditMode(false);
    setMsgDraft(null);
  }, [sel]);

  // （報價站資料載入 effect 移到 activePart 定義後——換料後要載 B 料的 ABCD/歷史）

  // 選中卡捲入可視
  useEffect(() => {
    listRef.current?.querySelector(`[data-card="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  useEffect(() => {
    listRef.current?.focus();
  }, []);

  const cur = items[sel];
  // 生效料號＝換料後的 B、沒換＝原料號 A（報價/訊息/結案都走這顆；詢價紀錄留在 A）
  const activePart = useMemo<SwapPart | null>(() => {
    if (swapPart) return swapPart;
    if (!cur) return null;
    return { id: cur.partId, code: cur.code, name: cur.name, secCode: null, brandName: null, isOem: false };
  }, [swapPart, cur]);
  // 進報價站（集中初始化：卡片列選取歸零）
  const goQuote = useCallback(() => {
    setQSel(0);
    setQOpen(null);
    setQEdit(null);
    setErr(null);
    setStage(4);
    setTimeout(() => subPanelRef.current?.focus(), 0);
  }, []);

  // 報價站：載入生效料號的 ABCD 建議售價 + 該客戶報價/成交歷史（換料後＝B 料的參考）
  useEffect(() => {
    const c = items[sel];
    const p = swapPart ?? (c ? { id: c.partId } : null);
    if (stage !== 4 || !c || !p) {
      setAbcd(null);
      setPriceHist(null);
      return;
    }
    let alive = true;
    setAbcd(null);
    setPriceHist(null);
    void getPartDetail(p.id)
      .then((d) => alive && setAbcd(d))
      .catch(() => {});
    if (c.customerId) {
      void getQuotePriceHistory(c.customerId, p.id, 12)
        .then((r) => alive && setPriceHist(r.rows))
        .catch(() => alive && setPriceHist([]));
    }
    return () => {
      alive = false;
    };
  }, [stage, sel, items, swapPart]);

  // 訊息生成（共用 buildQuoteMessage、走生效料號）；手動稿以最後動作為準、設定/內容變更即重生成（F2 定案 5a）
  const f5MsgText = useMemo(() => {
    if (!cur || !activePart) return '';
    return buildQuoteMessage(
      [
        {
          name: activePart.name,
          code: activePart.code,
          secCode: activePart.secCode,
          brand: null,
          brandName: activePart.brandName,
          isOem: activePart.isOem,
          qty: Number(quoteQty) || cur.qty,
          price: quotePrice || 0,
          transfer: true,
          remark: quoteRemark,
        },
      ],
      msgOpts,
    );
  }, [cur, activePart, quoteQty, quotePrice, quoteRemark, msgOpts]);
  useEffect(() => {
    setMsgDraft(null);
  }, [f5MsgText]);
  const msgText = msgDraft ?? f5MsgText;

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
    if (stage === 5) return; // 訊息站：主容器＝訊息框（textarea 自己接鍵）、清單導航停用
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

  // 副容器鍵盤：Esc 逐階段回退（訊息→報價→詢價→待辦）；詢價站 ↑↓/Alt+A/Enter；
  //   報價站卡片列（對齊 F2）：↑↓ 選卡、Enter 展開/編輯、←→ 回詢價/進訊息
  const onSubKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!cur) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (stage === 5) {
        setEditMode(false);
        setStage(4);
      } else if (stage === 4) {
        if (qOpen) setQOpen(null); // 展開中：先收合
        else setStage(2); // 回換料
      } else if (stage === 3 || stage === 2) {
        setStage(stage === 3 ? 2 : 1);
      } else setTimeout(() => listRef.current?.focus(), 0);
      return;
    }
    if (stage === 4 && cur.customerId) {
      if (qEdit) return; // 編輯輸入框自己接鍵
      if (qOpen === 'hist') {
        const rows = (priceHist ?? []).slice(0, 8);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setQHistSel((i) => Math.min(rows.length - 1, i + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setQHistSel((i) => Math.max(0, i - 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const p = rows[qHistSel];
          if (p) setQuotePrice(String(p.amount));
          setQOpen(null);
        }
        return;
      }
      if (qOpen === 'abcd') {
        if (e.key === 'Enter') {
          e.preventDefault();
          setQOpen(null);
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setQSel((i) => Math.min(Q_ROWS.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setQSel((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setStage(3);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setStage(1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (qSel === QR_SUGGESTED) setQOpen('abcd');
        else if (qSel === QR_HIST) {
          if ((priceHist ?? []).length > 0) {
            setQHistSel(0);
            setQOpen('hist');
          }
        } else if (qSel === QR_QTY || qSel === QR_PRICE || qSel === QR_REMARK) {
          setQEdit(qSel === QR_QTY ? 'qty' : qSel === QR_PRICE ? 'price' : 'remark');
          setTimeout(() => {
            qEditRef.current?.focus();
            qEditRef.current?.select();
          }, 30);
        }
        // 調貨成本／調貨對象：純顯示、不展開
      }
      return;
    }
    if (stage === 5 && cur.customerId) {
      // 訊息站設定卡（對齊 F2 stage5）：↑↓ 選卡、Space 開關、Enter 存檔結案
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setOptSel((i) => Math.min(MSG_OPT_DEFS.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setOptSel((i) => Math.max(0, i - 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        const def = MSG_OPT_DEFS[optSel];
        if (def) setOpt({ [def.key]: !msgOpts[def.key] });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!busy) void closeOut();
      }
      return;
    }
    if (stage !== 1) return; // 無客戶的訊息站等：其他鍵由欄位/按鈕處理
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
        setQSel(0);
        setQOpen(null);
        setQEdit(null);
        setErr(null);
        setSwapPart(null);
        setStage(2); // 進換料站（同行報別的牌→選 B；同牌→「用原料號報價」直進報價）
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
        partId: swapPart?.id ?? cur.partId, // 生效料號（換料後＝B）
        qty: Number(quoteQty) || cur.qty,
        unitPrice: Number(quotePrice),
        source: 'INSTANT',
        isTransfer: true,
        remark: quoteRemark.trim() || undefined,
      });
      removeTransferItem(cur.customerId, cur.partId); // 結案＝移出缺貨待辦
      setStage(1);
      setPicked(null);
      setSwapPart(null);
      setEditMode(false);
      setMsgDraft(null);
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
      initialFocusRef={listRef}
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

          {/* B 主容器：缺貨待辦列表；訊息站＝給客戶的訊息（對齊 F2 stage5：左訊息框、右設定卡）*/}
          <section
            ref={listRef}
            tabIndex={0}
            onKeyDown={onKey}
            className="flex min-h-0 flex-col overflow-auto border-r border-border/40 px-5 py-4 outline-none transition-[background-color,box-shadow] focus-within:bg-primary/[0.03] focus-within:ring-1 focus-within:ring-inset focus-within:ring-primary/25"
          >
            {stage === 5 && cur ? (
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <div className={secHead}>
                  給客戶的訊息
                  {editMode ? <span className="ml-2 normal-case tracking-normal text-primary">編輯模式</span> : null}
                </div>
                <textarea
                  ref={msgRef}
                  readOnly={!editMode}
                  value={msgText || '（沒有報價內容——回報價站填價）'}
                  onChange={(e) => setMsgDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (!editMode) return;
                    // 同 F2 定案 4：編輯模式 Enter＝回副容器、換行走 Shift+Enter
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      setEditMode(false);
                      setTimeout(() => subPanelRef.current?.focus(), 0);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditMode(false);
                      setTimeout(() => subPanelRef.current?.focus(), 0);
                    }
                  }}
                  className={`min-h-0 w-full flex-1 resize-none overflow-auto rounded-md border px-3 py-2 font-mono text-[13px] leading-relaxed text-foreground ${
                    editMode ? 'border-primary/60 bg-background' : 'border-border bg-muted/20'
                  }`}
                />
              </div>
            ) : (
              <>
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
              </>
            )}
          </section>

          {/* C 副容器：詢價站（↑↓ 選詢價・Alt+A 新增・Enter 帶去報價・Esc 回待辦）*/}
          <aside
            ref={subPanelRef}
            tabIndex={0}
            onKeyDown={onSubKey}
            className="flex min-h-0 flex-col overflow-auto bg-background/20 px-5 py-4 outline-none transition-[background-color,box-shadow] focus-within:bg-primary/[0.03] focus-within:ring-1 focus-within:ring-inset focus-within:ring-primary/25"
          >
            {stage === 2 && cur ? (
              /* 換料站：同行報的牌跟原料號不同 → 從主檔選 B 料替換（找不到 → 建檔站）*/
              <div className="flex min-h-0 flex-col gap-3">
                <div className={secHead}>換料 · 原料號 {cur.code}</div>
                {swapPart ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/45 bg-primary/[0.07] px-3 py-2 text-[12.5px]">
                    <span>
                      已換：<span className="font-mono font-semibold text-primary">{swapPart.code}</span> {swapPart.name}
                      {swapPart.brandName ? <span className="ml-1 text-muted-foreground">· {swapPart.brandName}</span> : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSwapPart(null)}
                      className="shrink-0 rounded border border-border/50 px-2 py-0.5 text-[11px] hover:border-destructive/50 hover:text-destructive"
                    >
                      取消換料
                    </button>
                  </div>
                ) : (
                  <div className="text-[12px] text-muted-foreground">
                    同行報的牌跟原料號不同？搜主檔選出實際要報的料（例：問 BOSCH、對方只有 HEGNST）
                  </div>
                )}
                <PartPicker
                  autoFocus
                  onPick={(p) => {
                    setSwapPart({
                      id: p.id,
                      code: p.code,
                      name: p.name,
                      secCode: p.secCode,
                      brandName: p.brandName,
                      isOem: false,
                    });
                    goQuote();
                  }}
                />
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStage(3)}
                    className="rounded border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-[12.5px] text-amber-600 hover:bg-amber-500/20"
                  >
                    主檔沒這顆 → 建檔（Alt+3）
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSwapPart(null);
                      goQuote();
                    }}
                    className="rounded bg-primary px-4 py-1.5 text-[12.5px] text-primary-foreground"
                  >
                    用原料號報價（Alt+4）
                  </button>
                </div>
              </div>
            ) : stage === 3 && cur ? (
              /* 建檔站：快速建檔（SYSADMIN/OWNER）／通知建檔人員——下一 commit 實作 */
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3 text-center text-[12.5px] text-muted-foreground">
                <PackagePlus className="size-6 text-muted-foreground/60" />
                <span className="text-[13px] font-medium text-foreground/80">快速建檔（建置中）</span>
                <span>同行報的料主檔沒有時：有建檔權限在此快速建檔、無權限產通知文字給建檔人員。</span>
                <span>先用主檔既有料（Alt+2 回換料）或通知建檔人員建好後再回來。</span>
              </div>
            ) : stage === 4 ? (
              /* 報價站：給客戶售價（底價＝選定同行成本；換料後全走 B 料）*/
              <div className="flex min-h-0 flex-col gap-3">
                <div className={secHead}>
                  報價 · {activePart?.code}
                  {swapPart ? (
                    <span className="ml-2 rounded border border-primary/50 bg-primary/12 px-1.5 py-px text-[10px] normal-case tracking-normal text-primary">
                      已換料
                    </span>
                  ) : null}
                </div>
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
                      　<span className="font-mono">{activePart?.code}</span> {activePart?.name}
                      {swapPart?.brandName ? <span className="ml-1 text-muted-foreground">· {swapPart.brandName}</span> : null}
                      {swapPart ? <span className="ml-1 text-[11px] text-muted-foreground/70">（原 {cur.code}）</span> : null}
                    </div>

                    {/* 卡片式屬性列（對齊 F2 屬性面板）：↑↓ 選卡、Enter 展開/編輯、Esc 收合/回詢價 */}
                    <div className="space-y-1.5">
                      {Q_ROWS.map((label, i) => {
                        const active = i === qSel;
                        const value =
                          i === QR_SUGGESTED
                            ? abcd === null
                              ? '…'
                              : 'ABCD'
                            : i === QR_COST
                              ? picked
                                ? `NT$ ${fmtNt(Number(picked.unitPrice))}（底價）`
                                : '—'
                              : i === QR_HIST
                                ? (() => {
                                    if (priceHist === null) return '…';
                                    const p = priceHist.find((h) => h.scope === 'CUSTOMER') ?? priceHist[0];
                                    return p
                                      ? `${p.kind === 'SALE' ? '成交' : '報價'} NT$ ${fmtNt(Number(p.amount))}`
                                      : '—（無前價）';
                                  })()
                                : i === QR_PARTNER
                                  ? picked
                                    ? (picked.partnerName ?? picked.partnerCode ?? '同行')
                                    : '—'
                                  : i === QR_QTY
                                    ? quoteQty
                                    : i === QR_PRICE
                                      ? quotePrice || '未填'
                                      : quoteRemark || '—';
                        const editing =
                          qEdit !== null &&
                          active &&
                          ((qEdit === 'qty' && i === QR_QTY) ||
                            (qEdit === 'price' && i === QR_PRICE) ||
                            (qEdit === 'remark' && i === QR_REMARK));
                        return (
                          <div key={label}>
                            <div
                              onClick={() => setQSel(i)}
                              className={`flex items-center justify-between gap-3 rounded-lg border-2 px-3 py-2 ${
                                active ? 'border-primary bg-primary/10' : 'border-border/35 bg-secondary/30'
                              }`}
                            >
                              <span className="text-[12.5px] text-foreground/70">{label}</span>
                              {editing ? (
                                <input
                                  ref={qEditRef}
                                  type={qEdit === 'remark' ? 'text' : 'number'}
                                  min="0"
                                  step={qEdit === 'price' ? '0.01' : '1'}
                                  maxLength={qEdit === 'remark' ? 100 : undefined}
                                  value={qEdit === 'qty' ? quoteQty : qEdit === 'price' ? quotePrice : quoteRemark}
                                  onChange={(e) => {
                                    if (qEdit === 'qty') setQuoteQty(e.target.value);
                                    else if (qEdit === 'price') setQuotePrice(e.target.value);
                                    else setQuoteRemark(e.target.value);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === 'Escape') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setQEdit(null);
                                      setTimeout(() => subPanelRef.current?.focus(), 0);
                                    }
                                  }}
                                  placeholder={qEdit === 'remark' ? '如：5個在新莊倉' : ''}
                                  className={`rounded border bg-background px-2 py-1 text-sm ${
                                    qEdit === 'remark' ? 'w-48 text-right' : 'w-28 text-right font-mono tabular-nums'
                                  }`}
                                />
                              ) : (
                                <span
                                  className={`min-w-0 truncate text-right font-mono text-[13.5px] tabular-nums ${
                                    i === QR_PRICE && quotePrice ? 'font-semibold text-primary' : 'text-foreground/95'
                                  }`}
                                >
                                  {value}
                                </span>
                              )}
                            </div>
                            {/* 展開：建議售價 ABCD 四格 */}
                            {i === QR_SUGGESTED && qOpen === 'abcd' ? (
                              <div className="mt-1.5 grid grid-cols-4 gap-1.5 px-1">
                                {(['A', 'B', 'C', 'D'] as const).map((g) => {
                                  const v = abcd?.[`price${g}` as 'priceA' | 'priceB' | 'priceC' | 'priceD'];
                                  return (
                                    <button
                                      key={g}
                                      type="button"
                                      disabled={!v}
                                      onClick={() => {
                                        if (v) setQuotePrice(String(v));
                                        setQOpen(null);
                                      }}
                                      className="rounded-md border border-border/50 bg-secondary px-1.5 py-1 text-center hover:border-primary/50 disabled:opacity-60 disabled:hover:border-border/50"
                                    >
                                      <div className="text-[10px] text-foreground/60">{g} 價</div>
                                      <div className="font-mono text-[13px] font-semibold tabular-nums">
                                        {abcd ? (v ? fmtNt(Number(v)) : '—') : '…'}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                            {/* 展開：報價/成交歷史（↑↓ 選、Enter 帶入報價）*/}
                            {i === QR_HIST && qOpen === 'hist' ? (
                              <div className="mt-1.5 space-y-1 px-1">
                                {(priceHist ?? []).slice(0, 8).map((h, hi) => (
                                  <div
                                    key={hi}
                                    onClick={() => {
                                      setQuotePrice(String(h.amount));
                                      setQOpen(null);
                                    }}
                                    className={`flex cursor-pointer items-baseline gap-2 rounded border px-2 py-1 text-[12px] ${
                                      hi === qHistSel ? 'border-primary bg-primary/10' : 'border-border/30'
                                    }`}
                                  >
                                    <span className="font-mono text-[11px] text-muted-foreground">{h.date.slice(0, 10)}</span>
                                    <span className={h.kind === 'SALE' ? 'text-[#22D88F]' : 'text-primary'}>
                                      {h.kind === 'SALE' ? '成交' : '報價'}
                                    </span>
                                    {h.qty ? <span className="text-muted-foreground">× {Number(h.qty)}</span> : null}
                                    <span className="ml-auto font-mono font-semibold tabular-nums">
                                      NT$ {fmtNt(Number(h.amount))}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-[11px] text-muted-foreground/60">
                      ↑↓ 選卡・Enter 展開/編輯・Alt+S 進訊息・Alt+1 回詢價
                    </div>

                    {err ? <div className="text-xs text-destructive">{err}</div> : null}
                  </>
                )}
              </div>
            ) : stage === 5 && cur ? (
              /* 訊息站副容器（對齊 F2 stage5）：設定卡 ↑↓ 選、Space 開關、Enter 存檔結案；Alt+E 編輯訊息 */
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className={secHead}>訊息內容設定（會記住）</div>
                <div className="space-y-1.5">
                  {MSG_OPT_DEFS.map((def, i) => {
                    const on = msgOpts[def.key];
                    return (
                      <div
                        key={def.key}
                        onClick={() => {
                          setOptSel(i);
                          setOpt({ [def.key]: !on });
                        }}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border-2 px-3 py-2 text-[13px] ${
                          i === optSel ? 'border-primary bg-primary/10' : 'border-border/35 bg-secondary/30 hover:border-primary/45'
                        }`}
                      >
                        <span className="text-foreground/85">{def.label}</span>
                        <span
                          className={`shrink-0 rounded border px-1.5 py-px font-mono text-[10px] ${
                            on ? 'border-[#22D88F]/60 bg-[#22D88F]/12 text-[#22D88F]' : 'border-border/50 text-muted-foreground/60'
                          }`}
                        >
                          {on ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[11px] text-muted-foreground/70">
                  ↑↓ 選卡・Space 開關・Enter 存檔結案・Alt+E 編輯訊息（變更設定會重新生成、手動編輯以最後動作為準）
                </div>
                {!cur.customerId ? (
                  <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-600">
                    此筆未指定客戶——訊息可複製、無法存報價結案
                  </div>
                ) : null}
                {err ? <div className="text-xs text-destructive">{err}</div> : null}
                <div className="mt-auto flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(msgText)}
                    disabled={!msgText}
                    className="rounded border px-4 py-1.5 text-sm disabled:opacity-50"
                  >
                    複製訊息
                  </button>
                  <button
                    type="button"
                    disabled={busy || !cur.customerId}
                    onClick={() => void closeOut()}
                    className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
                  >
                    {busy ? '結案中…' : '存報價＋結案'}
                  </button>
                </div>
              </div>
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
          <span>待辦：↑↓ 選・Enter 進詢價・Delete 移除｜詢價：↑↓ 選・Alt+A 新增・Enter 進換料｜Alt+1~5 切站（詢價/換料/建檔/報價/訊息）・Alt+S 訊息・Esc 回・Alt+H 說明</span>
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
            <HelpRow k="Alt+1~5" desc="切五站：詢價／換料／建檔／報價／訊息" />
            <HelpRow k="Alt+S" desc="進訊息站（同 F2 結案鍵）" />
            <HelpRow k="↑↓" desc="待辦：選料；詢價站：選詢價；報價站：選卡片；訊息站：選設定卡" />
            <HelpRow k="Enter" desc="待辦→進詢價；詢價→帶詢價進換料；報價站→展開/編輯；訊息站→存檔結案" />
            <HelpRow k="Space" desc="訊息站：設定卡開/關" />
            <HelpRow k="Alt+E" desc="訊息站：編輯訊息（Enter 回、Shift+Enter 換行）" />
            <HelpRow k="Alt+A" desc="詢價站新增一筆詢價（同行→量→價→備註）" />
            <HelpRow k="Delete" desc="待辦移除選中料（已記的詢價紀錄不受影響）" />
            <HelpRow k="Esc" desc="展開→收合；報價→詢價→待辦 逐層回；待辦→關視窗" />
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
