// apps/nx-ui/src/features/nx04/quote/ui/GlobalTransferInquiry.tsx
// F5 全域即時調貨詢價視窗（執行長 2026-07-12 拍板；同日鍵盤流升級 2/7）：
//   F2 報價④選「調貨」／F1 主視窗 Alt+D 加進來的清單在這消化——掛掉客戶電話後、
//   照卡片打給同行、Enter 對選中料記一筆詢價（nx-instant-inquiry → InstantInquiryDialog）。
//   每張卡帶「近30天 N 筆・最低 X（同行）」摘要（口徑=近 30 天、執行長 07/13 拍板）、
//   選中卡展開窗內最近 5 筆明細（比價在 Line 上完成、系統只記錄——S01 關卡二定案、
//   不做並排比價視圖）。Delete 移除、清單存本機（localStorage）。
//   ⚠️ F5 攔掉瀏覽器重新整理（Ctrl+R 仍可用）——鍵盤優先 ERP 的取捨、執行長拍板。
'use client';

import { HelpCircle, PhoneCall, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { listInquiryRecords } from '@data/endpoints/nx04/record/api/record';
import type { InquiryRecord } from '@data/types/nx04/record';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

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
  const [helpOpen, setHelpOpen] = useState(false);
  // partId → 摘要（undefined=載入中）
  const [sums, setSums] = useState<Map<string, PartInquirySummary>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);
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
      setTimeout(() => listRef.current?.focus(), 60);
    };
    window.addEventListener('nx-inquiry-recorded', h);
    return () => window.removeEventListener('nx-inquiry-recorded', h);
  }, [items, fetchPart]);

  useEffect(() => {
    if (sel >= items.length) setSel(Math.max(0, items.length - 1));
  }, [items.length, sel]);

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
      e.preventDefault();
      if (cur) fireInquiry(cur);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      if (cur) removeTransferItem(cur.customerId, cur.partId);
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
      dialogStyle={{ width: 'min(860px, 96vw)', height: 'min(640px, 92vh)' }}
    >
      <>
        <div className="flex items-center gap-2.5 border-b border-border/40 px-6 py-3">
          <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_#02EDAB]" />
          <PhoneCall className="size-[18px] text-primary" />
          <h2 className="text-[15px] font-semibold tracking-wide">即時調貨詢價</h2>
          <span className="text-[12px] text-muted-foreground">清單 {items.length} 顆・打給同行、問到價就記</span>
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

        <div
          ref={listRef}
          tabIndex={0}
          onKeyDown={onKey}
          className="min-h-0 flex-1 space-y-2 overflow-auto px-6 py-4 outline-none"
        >
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              調貨清單是空的——F2 報價④出貨倉庫選
              <kbd className="mx-1 rounded border border-border/50 bg-muted/40 px-1 font-mono text-[11px]">調貨</kbd>、
              或 F1 主視窗聚焦缺貨料按
              <kbd className="mx-1 rounded border border-border/50 bg-muted/40 px-1 font-mono text-[11px]">Alt+D</kbd>
              加進來
            </div>
          ) : (
            items.map((it, i) => {
              const isSel = i === sel;
              const s = sums.get(it.partId);
              return (
                <div
                  key={transferItemKey(it.customerId, it.partId)}
                  data-card={i}
                  onClick={() => setSel(i)}
                  className={`cursor-pointer rounded-lg border px-4 py-2.5 transition-colors ${
                    isSel
                      ? 'border-primary/55 bg-primary/[0.07] shadow-[inset_3px_0_0_var(--primary)]'
                      : 'border-border/50 bg-background/40 hover:bg-accent/10'
                  }`}
                >
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-mono text-[14px] font-semibold tracking-wide text-primary/90">{it.code}</span>
                    <span className="text-[15px] font-medium">{it.name}</span>
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground/70">
                      {it.addedAt.slice(5, 16).replace('T', ' ')} 加入
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {summaryLine(it.partId)}
                    <span className="ml-auto flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSel(i);
                          fireInquiry(it);
                        }}
                        className="rounded border border-primary/55 bg-primary/12 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/20"
                      >
                        記詢價
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTransferItem(it.customerId, it.partId);
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="移除"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>
                  </div>
                  {/* 選中卡展開：近 30 天內最近 5 筆同行詢價（比價參考）*/}
                  {isSel && s && s.recs.length > 0 ? (
                    <table className="mt-2 w-full border-collapse border-t border-border/30 text-[13px]">
                      <tbody>
                        {s.recs.slice(0, 5).map((r) => (
                          <tr key={r.id} className="border-b border-border/15 last:border-b-0">
                            <td className="py-1 pr-3 font-mono text-[12px] text-muted-foreground">{r.recordDate.slice(0, 10)}</td>
                            <td className="py-1 pr-3">{r.partnerName ?? r.partnerCode ?? '—'}</td>
                            <td className="py-1 pr-3 text-right font-mono tabular-nums">{Number(r.qty)}</td>
                            <td className="py-1 text-right font-mono font-semibold tabular-nums text-primary">
                              {fmtNt(Number(r.unitPrice))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/35 bg-background/35 px-6 py-2 text-[11px] text-muted-foreground/70">
          <span>↑↓ 選料｜Enter 記詢價｜Delete 移除｜Alt+H 說明｜Esc 關閉</span>
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

function TransferHelpOverlay({ onClose }: { onClose: () => void }) {
  const Row = ({ k, desc }: { k: string; desc: string }) => (
    <>
      <span className="text-right">
        <kbd className="rounded border border-border/45 bg-background/45 px-1.5 py-px font-mono text-[11px] text-muted-foreground/90">
          {k}
        </kbd>
      </span>
      <span className="text-[13px] text-foreground/90">{desc}</span>
    </>
  );
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
            <Row k="F5" desc="任何頁面開／關本視窗（瀏覽器重新整理改 Ctrl+R）" />
            <Row k="↑↓" desc="選料（選中卡展開近 30 天內最近 5 筆同行詢價）" />
            <Row k="Enter" desc="對選中料記一筆詢價（選同行→量→價、存檔即回清單）" />
            <Row k="Delete" desc="移除選中料（已記的詢價紀錄不受影響）" />
            <Row k="Alt+H" desc="本說明（引導精靈通用鍵）" />
            <Row k="Esc" desc="關閉視窗（清單保留、下次 F5 繼續）" />
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
