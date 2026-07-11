// apps/nx-ui/src/features/nx04/quote/ui/GlobalQuoteSession.tsx
// F2 即時報價查詢（執行長 2026-07-12 主視窗改版・五點回饋版）
//
// 三窗：客戶窗（可 Alt+N 跳過＝散客）→ 三查法搜尋窗 → 報價主視窗（共用 PartMainWindow）：
//   · 右欄 quote 瘦身卡（料號/品名/廠牌/庫存/建議售價——依客戶等級＝該客戶地板價、餵 candidates API）
//   · 中欄下半＝三張價格卡（Alt+1 ABCD 價／Alt+2 該客戶紀錄／Alt+3 其他客戶紀錄、點卡同效）
//   · Space 多選 → Alt+Q 報價環節（防呆：全公司無庫存且近月無同行詢價 → 提示）
//   · Space 多選 → Alt+D 加入調貨清單（防呆：公司有貨 → 提示；清單由 F5 全域調貨詢價視窗消化）
// 報價環節：量價 Enter 鏈 → 末欄 Enter＝存檔 → 確認視窗（Enter 確認）→ 存 N 筆紀錄 → 回主視窗；
//   Alt+A 全選「給客戶的訊息」讓業務 Ctrl+C。散客＝可複製訊息、存紀錄前需補客戶。
'use client';

import { Copy, FilePlus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  getPartSalesHistory,
} from '@data/endpoints/nx01/part-search/api/part-search';
import { getQuoteCandidates, getQuotePriceIntel } from '@data/endpoints/nx04/quote/api/quote';
import {
  createQuoteRecord,
  listInquiryRecords,
  listQuoteRecords,
} from '@data/endpoints/nx04/record/api/record';
import type { PartCompatMemberDto } from '@data/types/nx01/part-search';
import type { QuoteCandidate, QuotePriceIntel } from '@data/types/nx04/quote';
import { PartMainWindow } from '@design/components/quick-search/PartMainWindow';
import { PartQuickSearchModal } from '@design/components/quick-search/PartQuickSearchModal';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

import { CustomerPicker, type PickedCustomer } from './CustomerPicker';
import { addTransferItems, listTransferItems, TRANSFER_LIST_EVENT } from './transfer-inquiry-store';

// 報價金額格式（對齊 InstantQuoteDialog / SalesFlowHub formatNt）
function formatNt(n: number): string {
  if (n < 100 && n !== Math.floor(n)) return n.toFixed(2);
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}
const dShort = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '—');

type EnvItem = { partId: string; code: string; name: string; onHand: number; qty: string; price: string };
type DetailReq = { kind: 1 | 2 | 3; partId: string; code: string };

export function GlobalQuoteSession() {
  const [mounted, setMounted] = useState(false);
  const [customerStage, setCustomerStage] = useState(true);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [mainPartId, setMainPartId] = useState<string | null>(null);
  // 右欄建議售價（依客戶等級）：mainPartId × customer → candidates API
  const [candMap, setCandMap] = useState<Record<string, QuoteCandidate>>({});
  const [quoteEnv, setQuoteEnv] = useState<EnvItem[] | null>(null);
  const [detailReq, setDetailReq] = useState<DetailReq | null>(null);
  const [transferCount, setTransferCount] = useState(0);
  const candReqRef = useRef(0);

  // F2 開工作台（開著再按不 toggle 關）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        setMounted(true);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  // 調貨清單數（徽章顯示、跨視窗同步）
  useEffect(() => {
    const sync = () => setTransferCount(listTransferItems().length);
    sync();
    window.addEventListener(TRANSFER_LIST_EVENT, sync);
    return () => window.removeEventListener(TRANSFER_LIST_EVENT, sync);
  }, []);

  // 接搜尋窗 nx-part-selected → 開報價主視窗
  useEffect(() => {
    if (!mounted || customerStage) return;
    const h = (e: Event) => {
      const ce = e as CustomEvent<{ partId?: string }>;
      const id = ce.detail?.partId;
      if (typeof id === 'string' && id) setMainPartId(id);
    };
    window.addEventListener('nx-part-selected', h);
    return () => window.removeEventListener('nx-part-selected', h);
  }, [mounted, customerStage]);

  // 主視窗開著＋有客戶 → 抓整組候選（右欄建議售價 + 報價環節帶價）
  useEffect(() => {
    if (!mainPartId || !customer) {
      setCandMap({});
      return;
    }
    const myReq = ++candReqRef.current;
    void (async () => {
      try {
        const r = await getQuoteCandidates(customer.id, mainPartId, customer.defaultWarehouseId ?? undefined);
        if (candReqRef.current !== myReq) return;
        setCandMap(Object.fromEntries(r.candidates.map((c) => [c.id, c])));
      } catch {
        if (candReqRef.current === myReq) setCandMap({});
      }
    })();
  }, [mainPartId, customer]);

  const resetAll = () => {
    setMounted(false);
    setCustomerStage(true);
    setCustomer(null);
    setMainPartId(null);
    setCandMap({});
    setQuoteEnv(null);
    setDetailReq(null);
  };

  const prefillFor = useCallback(
    (partId: string) => {
      const c = candMap[partId];
      return c ? (c.customerLastAmount ?? c.suggestedPrice ?? '') : '';
    },
    [candMap],
  );

  // Alt+Q 報價環節（防呆：全公司無庫存且近月無同行詢價 → 提示確認）
  const openQuoteEnv = useCallback(
    async (rows: PartCompatMemberDto[]) => {
      const zeroRows = rows.filter((r) => Number(r.onHandTotal) <= 0);
      if (zeroRows.length > 0) {
        const dateFrom = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        const noInquiry: string[] = [];
        await Promise.all(
          zeroRows.map(async (r) => {
            try {
              const res = await listInquiryRecords({ partNo: r.code, dateFrom, pageSize: 1 });
              if (res.items.length === 0) noInquiry.push(r.code);
            } catch {
              /* 查不到不擋、不列入警示 */
            }
          }),
        );
        if (noInquiry.length > 0) {
          const ok = window.confirm(
            `⚠️ 這 ${noInquiry.length} 顆全公司無庫存、近一個月也沒問過同行：\n${noInquiry.join('\n')}\n\n報了可能交不出來——確定要報價？`,
          );
          if (!ok) return;
        }
      }
      setQuoteEnv(
        rows.map((r) => ({
          partId: r.id,
          code: r.code,
          name: r.name,
          onHand: Number(r.onHandTotal),
          qty: '1',
          price: prefillFor(r.id),
        })),
      );
    },
    [prefillFor],
  );

  // Alt+D 加入調貨清單（防呆：公司有貨 → 提示確認）
  const addToTransfer = useCallback((rows: PartCompatMemberDto[]) => {
    const stocked = rows.filter((r) => Number(r.onHandTotal) > 0);
    if (stocked.length > 0) {
      const ok = window.confirm(
        `⚠️ 這 ${stocked.length} 顆公司有現貨：\n${stocked.map((r) => `${r.code}（庫存 ${Number(r.onHandTotal)}）`).join('\n')}\n\n確定還要加入調貨詢價清單？`,
      );
      if (!ok) return;
    }
    addTransferItems(rows.map((r) => ({ partId: r.id, code: r.code, name: r.name })));
  }, []);

  if (!mounted) return null;

  const chip = (
    <CustomerChip
      customer={customer}
      transferCount={transferCount}
      onChangeCustomer={() => setCustomerStage(true)}
    />
  );

  return (
    <>
      {customerStage ? (
        <CustomerGate
          current={customer}
          onPick={(c) => {
            setCustomer(c);
            setCustomerStage(false);
          }}
          onSkip={() => setCustomerStage(false)}
          onClose={resetAll}
        />
      ) : (
        <>
          <PartQuickSearchModal
            onClose={resetAll}
            title="即時報價查詢"
            cornerBadge="F2 · QUOTE SEARCH"
            headerExtra={chip}
          />
          {mainPartId && (
            <PartMainWindow
              partId={mainPartId}
              entryContext={{
                entry: 'sales',
                warehouseId: customer?.defaultWarehouseId ?? undefined,
                warehouseName: customer?.defaultWarehouseName ?? undefined,
                label: customer?.defaultWarehouseId ? '客戶倉' : undefined,
              }}
              onBack={() => setMainPartId(null)}
              onClose={resetAll}
              cornerBadge="F2 · 報價主視窗"
              headerExtra={chip}
              compatVariant="quote"
              compatExtras={Object.fromEntries(
                Object.entries(candMap).map(([id, c]) => [id, { suggested: c.suggestedPrice }]),
              )}
              onQuoteMarked={(rows) => void openQuoteEnv(rows)}
              onTransferMarked={addToTransfer}
              onAltDigit={(n, ctx) => setDetailReq({ kind: n, ...ctx })}
              renderPriceSection={({ partId, code }) => (
                <PriceCards
                  key={partId}
                  customer={customer}
                  partId={partId}
                  onOpenDetail={(kind) => setDetailReq({ kind, partId, code })}
                />
              )}
            />
          )}
        </>
      )}

      {quoteEnv && (
        <QuoteEnvDialog
          customer={customer}
          items={quoteEnv}
          onPickCustomer={(c) => setCustomer(c)}
          onClose={() => setQuoteEnv(null)}
        />
      )}

      {detailReq && (
        <PriceDetailOverlay req={detailReq} customer={customer} onClose={() => setDetailReq(null)} />
      )}
    </>
  );
}

/** 客戶徽章：客戶＋調貨清單數＋換客戶 */
function CustomerChip({
  customer,
  transferCount,
  onChangeCustomer,
}: {
  customer: PickedCustomer | null;
  transferCount: number;
  onChangeCustomer: () => void;
}) {
  return (
    <span className="ml-2 inline-flex items-center gap-1.5 rounded border border-primary/50 bg-primary/12 px-2 py-0.5 text-[11px] text-primary">
      {customer ? (
        <>
          <span className="font-mono">{customer.code}</span>
          {customer.name}
        </>
      ) : (
        <span className="text-muted-foreground">散客／未選客戶</span>
      )}
      {transferCount > 0 ? (
        <span className="rounded bg-amber-500/20 px-1 font-mono text-amber-500" title="調貨詢價清單（F5 開）">
          調{transferCount}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onChangeCustomer}
        className="text-[10px] text-muted-foreground underline-offset-2 hover:underline"
      >
        換
      </button>
    </span>
  );
}

/** 視窗 0：客戶窗（可留空＝新客戶/散客、Alt+N 跳過）*/
function CustomerGate({
  current,
  onPick,
  onSkip,
  onClose,
}: {
  current: PickedCustomer | null;
  onPick: (c: PickedCustomer) => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel="即時報價・選客戶"
      backdropClassName="bg-black/55 backdrop-blur-sm animate-in fade-in duration-200"
      dialogClassName="rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55),0_0_50px_-18px_rgba(232,160,32,0.22)] animate-in fade-in zoom-in-95 duration-200"
      dialogStyle={{ width: 'min(520px, 94vw)' }}
    >
      <div
        className="space-y-4 p-6"
        onKeyDown={(e) => {
          if (e.altKey && (e.key === 'n' || e.key === 'N')) {
            e.preventDefault();
            onSkip();
          }
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_#02EDAB]" />
          <FilePlus className="size-[18px] text-primary" />
          <h2 className="text-[15px] font-semibold tracking-wide">即時報價查詢</h2>
          <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/65">
            F2 · 客戶
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          這通電話是誰？建議售價（地板價）依客戶等級計算——
          <b className="text-foreground">新客戶/散客可先跳過</b>、存紀錄前再補。
        </div>
        <CustomerPicker autoFocus onPick={onPick} onCommit={() => {}} />
        {current ? (
          <div className="text-xs text-muted-foreground">
            目前：<span className="font-mono">{current.code}</span> {current.name}（重選會換人）
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground/70">Enter 選定｜Esc 離開</span>
          <button
            type="button"
            onClick={onSkip}
            className="rounded border border-border px-3 py-1.5 text-sm hover:border-primary/50"
          >
            先不選、直接查料 <kbd className="ml-1 rounded border border-border/50 bg-muted/40 px-1 font-mono text-[10px]">Alt+N</kbd>
          </button>
        </div>
      </div>
    </FocusLockedDialog>
  );
}

/** 中欄下半・三張價格卡（Alt+1/2/3 或點卡開細節）*/
function PriceCards({
  customer,
  partId,
  onOpenDetail,
}: {
  customer: PickedCustomer | null;
  partId: string;
  onOpenDetail: (kind: 1 | 2 | 3) => void;
}) {
  const [intel, setIntel] = useState<QuotePriceIntel | null>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    if (!customer) {
      setIntel(null);
      return;
    }
    const myReq = ++reqRef.current;
    void (async () => {
      try {
        const r = await getQuotePriceIntel(customer.id, partId);
        if (reqRef.current === myReq) setIntel(r);
      } catch {
        if (reqRef.current === myReq) setIntel(null);
      }
    })();
  }, [customer, partId]);

  if (!customer) {
    return (
      <div className="rounded border border-dashed border-border/60 px-3 py-2 text-[12px] text-muted-foreground">
        未選客戶——建議售價（地板價）依客戶等級計算、選了客戶才會顯示
      </div>
    );
  }

  // 「前一次報價 or 成交」＝兩者取日期較近、並標記型別
  const latestOf = (
    q: { amount: string; date: string } | null | undefined,
    s: { amount: string; date: string } | null | undefined,
  ): { amount: string; date: string; type: '報價' | '成交' } | null => {
    if (q && s) return q.date >= s.date ? { ...q, type: '報價' } : { ...s, type: '成交' };
    if (q) return { ...q, type: '報價' };
    if (s) return { ...s, type: '成交' };
    return null;
  };
  const mine = latestOf(intel?.sameCustomerQuote, intel?.sameCustomerSale);
  const others = latestOf(intel?.sameGradeQuote, intel?.sameGradeSale);

  const Card = ({
    kbd,
    title,
    main,
    sub,
    kind,
    accent,
  }: {
    kbd: string;
    title: string;
    main: string;
    sub?: string;
    kind: 1 | 2 | 3;
    accent?: boolean;
  }) => (
    <button
      type="button"
      onClick={() => onOpenDetail(kind)}
      className={`flex flex-col gap-0.5 rounded-md border px-3 py-2 text-left shadow-sm transition-colors hover:border-primary/60 ${
        accent ? 'border-primary/50 bg-primary/10' : 'border-border/55 bg-secondary'
      }`}
      title={`${title}（${kbd} 開細節）`}
    >
      <span className="flex items-center justify-between text-[11px] font-medium text-foreground/60">
        {title}
        <kbd className="rounded border border-border/45 bg-background/45 px-1 font-mono text-[10px] text-muted-foreground/90">
          {kbd}
        </kbd>
      </span>
      <span className={`font-mono text-[19px] font-semibold ${accent ? 'text-primary' : 'text-foreground'}`}>
        {main}
      </span>
      <span className="text-[10.5px] text-muted-foreground/75">{sub ?? ' '}</span>
    </button>
  );

  return (
    <div className="grid grid-cols-3 gap-2">
      <Card
        kbd="Alt+1"
        kind={1}
        title="建議售價（地板）"
        main={intel?.suggestedPrice ? formatNt(Number(intel.suggestedPrice)) : '—'}
        sub="依客戶等級・細節看 ABCD 價"
        accent
      />
      <Card
        kbd="Alt+2"
        kind={2}
        title="過去交易（此客戶）"
        main={mine ? formatNt(Number(mine.amount)) : '—'}
        sub={mine ? `${mine.type}・${dShort(mine.date)}` : '近一個月無紀錄'}
      />
      <Card
        kbd="Alt+3"
        kind={3}
        title="其他交易（他客）"
        main={others ? formatNt(Number(others.amount)) : '—'}
        sub={others ? `${others.type}・${dShort(others.date)}` : '近一個月無紀錄'}
      />
    </div>
  );
}

/** Alt+1/2/3 細節窗：1=ABCD 價、2=該客戶紀錄表、3=其他客戶紀錄表（成交綠／報價金）*/
function PriceDetailOverlay({
  req,
  customer,
  onClose,
}: {
  req: DetailReq;
  customer: PickedCustomer | null;
  onClose: () => void;
}) {
  type HistRow = { date: string; type: '成交' | '報價'; customer: string; qty: string; price: string; src: string };
  const [abcd, setAbcd] = useState<{ label: string; value: string | null }[] | null>(null);
  const [rows, setRows] = useState<HistRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  const TITLES: Record<1 | 2 | 3, string> = {
    1: 'ABCD 價（建議售價階梯）',
    2: `過去交易紀錄・${customer ? customer.name : '此客戶'}`,
    3: '其他客戶交易紀錄',
  };

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        if (req.kind === 1) {
          const h = await getPartSalesHistory(req.partId);
          if (!alive) return;
          setAbcd([
            { label: 'A 價', value: h.suggestedPrices.priceA },
            { label: 'B 價', value: h.suggestedPrices.priceB },
            { label: 'C 價', value: h.suggestedPrices.priceC },
            { label: 'D 價（地板）', value: h.suggestedPrices.priceD },
          ]);
        } else {
          const mineKind = req.kind === 2;
          const [h, rec] = await Promise.all([
            getPartSalesHistory(req.partId),
            listQuoteRecords({
              partNo: req.code || undefined,
              pageSize: 100,
              ...(mineKind && customer ? { customerId: customer.id } : {}),
            }).catch(() => ({ items: [], page: 1, pageSize: 0, total: 0 })),
          ]);
          if (!alive) return;
          const isMine = (code: string | null | undefined) =>
            customer ? code === customer.code : false;
          const out: HistRow[] = [];
          for (const s of h.sales) {
            if (mineKind ? !isMine(s.customerCode) : isMine(s.customerCode)) continue;
            out.push({ date: s.soDate, type: '成交', customer: s.customerName, qty: s.qty, price: s.unitPrice, src: s.docNo });
          }
          for (const q of h.quotes) {
            if (mineKind ? !isMine(q.customerCode) : isMine(q.customerCode)) continue;
            out.push({ date: q.quoteDate, type: '報價', customer: q.customerName, qty: q.qty, price: q.unitPrice, src: q.docNo });
          }
          for (const r of rec.items) {
            if (r.source !== 'INSTANT') continue; // QUOTE 來源已由報價單列涵蓋、避免重複
            if (!mineKind && customer && r.customerId === customer.id) continue;
            out.push({
              date: r.recordDate,
              type: '報價',
              customer: r.customerName ?? r.customerCode ?? '—',
              qty: r.qty,
              price: r.unitPrice,
              src: '即時',
            });
          }
          out.sort((a, b) => (a.date < b.date ? 1 : -1));
          setRows(out.slice(0, 60));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req.kind, req.partId, req.code]);

  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel={TITLES[req.kind]}
      backdropClassName="bg-black/55 backdrop-blur-[2px] animate-in fade-in duration-150"
      dialogClassName="flex flex-col rounded-xl border border-border/60 bg-popover text-foreground shadow-[0_18px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-150"
      dialogStyle={{ width: req.kind === 1 ? 'min(420px, 92vw)' : 'min(760px, 94vw)', maxHeight: 'min(600px, 88vh)' }}
    >
      <>
        <div className="flex items-center gap-2.5 border-b border-border/40 px-5 py-2.5">
          <kbd className="rounded border border-primary/50 bg-primary/12 px-1.5 py-px font-mono text-[11px] font-bold text-primary">
            Alt+{req.kind}
          </kbd>
          <h3 className="text-sm font-bold tracking-wide">{TITLES[req.kind]}</h3>
          <span className="font-mono text-[12px] text-muted-foreground/75">{req.code}</span>
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
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">載入中…</div>
          ) : req.kind === 1 ? (
            <div className="space-y-1.5">
              {(abcd ?? []).map((r) => (
                <div key={r.label} className="flex items-baseline justify-between border-b border-border/25 pb-1.5 last:border-b-0">
                  <span className="text-[13px] text-foreground/70">{r.label}</span>
                  <span className={`font-mono text-[16px] font-semibold ${r.label.startsWith('D') ? 'text-primary' : 'text-foreground'}`}>
                    {r.value ? formatNt(Number(r.value)) : '—'}
                  </span>
                </div>
              ))}
              <div className="pt-2 text-[11px] text-muted-foreground/70">
                地板＝不可再低的底線；「建議售價」依客戶等級落在此階梯上
              </div>
            </div>
          ) : (rows ?? []).length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {req.kind === 2 && !customer ? '未選客戶——先回客戶窗選人' : '沒有紀錄'}
            </div>
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70">
                  <th className="py-1.5 pr-3 font-medium">日期</th>
                  <th className="py-1.5 pr-3 font-medium">類型</th>
                  <th className="py-1.5 pr-3 font-medium">客戶</th>
                  <th className="py-1.5 pr-3 text-right font-medium">數量</th>
                  <th className="py-1.5 pr-3 text-right font-medium">單價</th>
                  <th className="py-1.5 text-right font-medium">來源</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r, i) => (
                  <tr key={i} className="border-b border-border/15 last:border-b-0">
                    <td className="py-1.5 pr-3 font-mono text-[12px]">{dShort(r.date)}</td>
                    <td className="py-1.5 pr-3">
                      <span
                        className={`rounded px-1.5 py-px text-[11px] font-medium ${
                          r.type === '成交'
                            ? 'bg-[#22D88F]/12 text-[#22D88F]'
                            : 'bg-primary/12 text-primary'
                        }`}
                      >
                        {r.type}
                      </span>
                    </td>
                    <td className="max-w-[180px] truncate py-1.5 pr-3">{r.customer}</td>
                    <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{Number(r.qty)}</td>
                    <td className="py-1.5 pr-3 text-right font-mono font-medium tabular-nums">{formatNt(Number(r.price))}</td>
                    <td className="py-1.5 text-right font-mono text-[11px] text-muted-foreground/75">{r.src}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>
    </FocusLockedDialog>
  );
}

/** Alt+Q 報價環節：量價 Enter 鏈 → 末欄/按鈕 Enter＝存檔 → 確認視窗 → 存紀錄回主視窗；Alt+A 全選訊息 */
function QuoteEnvDialog({
  customer,
  items: initial,
  onPickCustomer,
  onClose,
}: {
  customer: PickedCustomer | null;
  items: EnvItem[];
  onPickCustomer: (c: PickedCustomer) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<EnvItem[]>(initial);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const qtyRefs = useRef<(HTMLInputElement | null)[]>([]);
  const priceRefs = useRef<(HTMLInputElement | null)[]>([]);
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const t = setTimeout(() => qtyRefs.current[0]?.focus(), 60);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (confirmOpen) confirmRef.current?.focus();
  }, [confirmOpen]);

  const setItem = (i: number, patch: Partial<EnvItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const valid = items.filter((it) => it.price !== '' && Number(it.qty) > 0 && Number(it.price) >= 0);

  const copyText = useMemo(
    () =>
      valid
        .map((it) => {
          const qtyPart = Number(it.qty) > 1 ? `　數量 ${Number(it.qty)}` : '';
          return `${it.code} ${it.name}${qtyPart}　報價 NT$ ${formatNt(Number(it.price))}`;
        })
        .join('\n'),
    [valid],
  );

  async function save() {
    if (!customer || valid.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      for (const it of valid) {
        await createQuoteRecord({
          customerId: customer.id,
          partId: it.partId,
          qty: Number(it.qty),
          unitPrice: Number(it.price),
          warehouseId: customer.defaultWarehouseId ?? undefined,
          source: 'INSTANT',
        });
      }
      onClose(); // 確認完關掉、回主視窗（執行長 Q4）
    } catch (e) {
      setErr(e instanceof Error ? e.message : '報價紀錄儲存失敗');
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm tabular-nums text-right';

  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel="報價環節"
      backdropClassName="bg-black/55 backdrop-blur-sm animate-in fade-in duration-150"
      dialogClassName="flex flex-col rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55),0_0_50px_-18px_rgba(232,160,32,0.22)] animate-in fade-in zoom-in-95 duration-150"
      dialogStyle={{ width: 'min(760px, 96vw)', maxHeight: 'min(720px, 92vh)' }}
    >
      <div
        className="flex max-h-[inherit] min-h-0 flex-1 flex-col"
        onKeyDown={(e) => {
          // Alt+A 全選「給客戶的訊息」（執行長 Q4：業務自己 Ctrl+C）
          if (e.altKey && (e.key === 'a' || e.key === 'A')) {
            e.preventDefault();
            msgRef.current?.focus();
            msgRef.current?.select();
          }
        }}
      >
        <div className="flex items-center gap-2.5 border-b border-border/40 px-6 py-3">
          <FilePlus className="size-[18px] text-primary" />
          <h2 className="text-[15px] font-semibold tracking-wide">報價環節</h2>
          <span className="text-[12px] text-muted-foreground">
            {customer ? (
              <>
                <span className="font-mono">{customer.code}</span> {customer.name}
              </>
            ) : (
              '散客／未選客戶'
            )}
            ・{items.length} 顆
          </span>
          <span className="ml-auto text-[11px] text-muted-foreground/65">
            量↵價↵＝下一顆｜末顆↵＝存檔｜Alt+A 全選訊息
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded-md border border-border/40 bg-background/40 p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            aria-label="關閉"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-auto px-6 py-4">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-left">料號／品名</th>
                <th className="w-16 px-2 py-1.5 text-right">庫存</th>
                <th className="w-20 px-2 py-1.5 text-right">數量</th>
                <th className="w-28 px-2 py-1.5 text-right">報價單價</th>
                <th className="w-10 px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.partId} className="border-b border-border/40 last:border-b-0">
                  <td className="px-2 py-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{it.code}</span>
                    <span className="ml-2">{it.name}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                    <span className={it.onHand > 0 ? 'text-[#22D88F]' : 'text-destructive'}>{it.onHand}</span>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      ref={(el) => {
                        qtyRefs.current[i] = el;
                      }}
                      type="number"
                      min="0"
                      step="1"
                      value={it.qty}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setItem(i, { qty: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          priceRefs.current[i]?.focus();
                        }
                      }}
                      className={inputCls}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      ref={(el) => {
                        priceRefs.current[i] = el;
                      }}
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.price}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setItem(i, { price: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const next = qtyRefs.current[i + 1];
                          if (next) next.focus();
                          else if (valid.length > 0) setConfirmOpen(true); // 末顆 Enter＝存檔（先確認）
                        }
                      }}
                      placeholder="留白＝不報"
                      className={`${inputCls} font-semibold`}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="移除"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {copyText ? (
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  給客戶的訊息（<kbd className="rounded border border-border/50 bg-muted/40 px-1 font-mono text-[10px]">Alt+A</kbd> 全選 → Ctrl+C）
                </span>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(copyText)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/40"
                >
                  <Copy className="size-3.5" />
                  複製
                </button>
              </div>
              <textarea
                ref={msgRef}
                readOnly
                rows={Math.min(6, Math.max(2, copyText.split('\n').length))}
                value={copyText}
                className="w-full resize-y rounded-md border border-border bg-muted/20 px-2 py-2 font-mono text-[11px] leading-relaxed text-foreground"
              />
            </div>
          ) : null}

          {!customer ? (
            <div className="space-y-2 rounded-lg border border-dashed border-border px-4 py-3">
              <div className="text-[12px] text-muted-foreground">
                散客：訊息可直接複製；<b className="text-foreground">要存報價紀錄請先補客戶</b>
              </div>
              <CustomerPicker onPick={onPickCustomer} onCommit={() => {}} />
            </div>
          ) : null}

          {err ? <div className="text-xs text-destructive">{err}</div> : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/35 bg-background/35 px-6 py-3">
          <span className="mr-auto text-[11px] text-muted-foreground/70">價留白＝該顆略過不報</span>
          <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">
            取消（回主視窗）
          </button>
          <button
            type="button"
            disabled={busy || !customer || valid.length === 0}
            onClick={() => setConfirmOpen(true)}
            className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            存檔（Enter）
          </button>
        </div>

        {/* 確認視窗（執行長 Q4：Enter 存檔 → 確認 → 關閉回主視窗）*/}
        {confirmOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-5 shadow-2xl">
              <h2 className="text-sm font-semibold">確認存檔</h2>
              <p className="text-sm text-muted-foreground">
                {customer ? `${customer.code} ${customer.name}` : '—'}
                <br />
                共 {valid.length} 筆報價紀錄、存檔後關閉回主視窗。
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setConfirmOpen(false)} className="rounded border px-4 py-1.5 text-sm">
                  返回
                </button>
                <button
                  ref={confirmRef}
                  type="button"
                  disabled={busy}
                  onClick={() => void save()}
                  className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
                >
                  {busy ? '儲存中…' : '確認 (Enter)'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </FocusLockedDialog>
  );
}
