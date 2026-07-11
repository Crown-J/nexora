// apps/nx-ui/src/features/nx04/quote/ui/GlobalQuoteSession.tsx
// F2 即時報價查詢（執行長 2026-07-12 改版：與 F1 同三窗架構、全鍵盤）
//
// 流程（執行長四點回饋逐條對應）：
//   視窗 0 客戶窗：先選客戶——「可留空」（新客戶/散客、Alt+N 跳過、結算時可補）
//   視窗 1 搜尋窗：與 F1 相同的三查法即時查詢（借 PartQuickSearchModal、角標 F2）
//   視窗 2 主視窗：借 PartMainWindow——左＝基本資料、中＝上庫存/下價格資訊
//     （歷史報價/成交五格＋量價輸入）、右＝通用零件列表
//   量 Enter → 價 Enter ＝ 加入報價 → 自動退回搜尋窗查下一顆（modal-stack 還原焦點）
//   搜尋窗 Esc/X → 結算窗：給客戶的訊息一鍵複製 + 存 N 筆 INSTANT 報價紀錄
//
// 鍵盤鏈：F2 → (Enter 選客戶 / Alt+N 跳過) → 查料 Enter → 量 Enter → 價 Enter → …重複… → Esc → 結算
'use client';

import { Copy, FilePlus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { getQuotePriceIntel } from '@data/endpoints/nx04/quote/api/quote';
import { createQuoteRecord } from '@data/endpoints/nx04/record/api/record';
import { PartMainWindow } from '@design/components/quick-search/PartMainWindow';
import { PartQuickSearchModal } from '@design/components/quick-search/PartQuickSearchModal';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

import { CustomerPicker, type PickedCustomer } from './CustomerPicker';
import { PriceIntelPanel } from './PriceIntelPanel';

type SessionLine = { partId: string; code: string; name: string; qty: string; price: string };

// 報價金額格式（對齊 InstantQuoteDialog / SalesFlowHub formatNt）
function formatNt(n: number): string {
  if (n < 100 && n !== Math.floor(n)) return n.toFixed(2);
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

export function GlobalQuoteSession() {
  const [mounted, setMounted] = useState(false);
  const [customerStage, setCustomerStage] = useState(true);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [mainPartId, setMainPartId] = useState<string | null>(null);
  const [lines, setLines] = useState<SessionLine[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  // F4／「即時報價」鈕 → 聚焦量價輸入（QuotePricePad 掛載時填入）
  const focusPadRef = useRef<() => void>(() => {});

  // F2 開工作台（開著再按不 toggle 關：報價清單是工作狀態、誤觸不能丟）
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

  // 接搜尋窗的 nx-part-selected → 開報價主視窗（同 F1 的三窗管線）
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

  const resetAll = () => {
    setMounted(false);
    setCustomerStage(true);
    setCustomer(null);
    setMainPartId(null);
    setLines([]);
    setSummaryOpen(false);
  };

  // 搜尋窗/主視窗 X 關閉：有行 → 進結算；沒行 → 直接關
  const requestClose = () => {
    if (lines.length > 0) setSummaryOpen(true);
    else resetAll();
  };

  // 加入/更新一行（同料重報＝覆蓋）→ 退回搜尋窗查下一顆
  const commitLine = (line: SessionLine) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.partId === line.partId);
      if (i >= 0) {
        const next = [...prev];
        next[i] = line;
        return next;
      }
      return [...prev, line];
    });
    setMainPartId(null);
  };

  if (!mounted) return null;

  const chip = <CustomerChip customer={customer} count={lines.length} onChangeCustomer={() => setCustomerStage(true)} />;

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
          onClose={() => (lines.length > 0 ? setSummaryOpen(true) : resetAll())}
        />
      ) : (
        <>
          <PartQuickSearchModal
            onClose={requestClose}
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
              onClose={requestClose}
              cornerBadge="F2 · 報價主視窗"
              autoFocusCompat={false}
              onQuoteAction={() => focusPadRef.current()}
              headerExtra={chip}
              renderPriceSection={({ partId, code, name, available }) => (
                <QuotePricePad
                  key={partId}
                  customer={customer}
                  partId={partId}
                  code={code}
                  name={name}
                  available={available}
                  existing={lines.find((l) => l.partId === partId) ?? null}
                  focusRef={focusPadRef}
                  onCommit={(qty, price) => commitLine({ partId, code, name, qty, price })}
                />
              )}
            />
          )}
        </>
      )}

      {summaryOpen && (
        <QuoteSessionSummary
          customer={customer}
          lines={lines}
          onPickCustomer={(c) => setCustomer(c)}
          onRemoveLine={(partId) => setLines((prev) => prev.filter((l) => l.partId !== partId))}
          onResume={() => setSummaryOpen(false)}
          onFinish={resetAll}
        />
      )}
    </>
  );
}

/** 客戶徽章（搜尋窗/主視窗共用）：客戶＋已報數＋換客戶 */
function CustomerChip({
  customer,
  count,
  onChangeCustomer,
}: {
  customer: PickedCustomer | null;
  count: number;
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
      <span className="rounded bg-primary/20 px-1 font-mono">{count}</span>
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
          這通電話是誰？之後查幾顆報幾顆、都算這個客戶的——
          <b className="text-foreground">新客戶/散客可先跳過</b>、結算存紀錄前再補。
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

/** 中欄下半・價格資訊＋量價輸入（掛在 PartMainWindow 的 renderPriceSection slot）*/
function QuotePricePad({
  customer,
  partId,
  code,
  name,
  available,
  existing,
  focusRef,
  onCommit,
}: {
  customer: PickedCustomer | null;
  partId: string;
  code: string;
  name: string;
  available: number;
  existing: SessionLine | null;
  focusRef: React.MutableRefObject<() => void>;
  onCommit: (qty: string, price: string) => void;
}) {
  const [qty, setQty] = useState(existing?.qty ?? '1');
  const [price, setPrice] = useState(existing?.price ?? '');
  const qtyRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  // F4／報價鈕 → 聚焦量
  useEffect(() => {
    focusRef.current = () => qtyRef.current?.focus();
  }, [focusRef]);

  // 開窗自動聚焦量（右欄聚焦已由 autoFocusCompat=false 讓位）
  useEffect(() => {
    const t = setTimeout(() => qtyRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // 自動帶價：近一月本客戶（報價/成交較近者）否則建議售價；已填/既有行不覆蓋
  useEffect(() => {
    if (!customer || existing) return;
    let alive = true;
    void (async () => {
      try {
        const intel = await getQuotePriceIntel(customer.id, partId);
        const cq = intel.sameCustomerQuote;
        const cs = intel.sameCustomerSale;
        const recent = cq && cs ? (cq.date >= cs.date ? cq : cs) : (cq ?? cs);
        const p = recent?.amount ?? intel.suggestedPrice ?? '';
        if (alive && p !== '') setPrice((cur) => (cur === '' ? p : cur));
      } catch {
        /* 查不到不擋 */
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, partId]);

  const short = Number(qty) > available;
  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm tabular-nums text-right';

  return (
    <div className="space-y-2.5">
      {/* 歷史報價/成交五格（跟著預覽件；未選客戶＝不帶）*/}
      {customer ? (
        <PriceIntelPanel customerId={customer.id} partId={partId} />
      ) : (
        <div className="rounded border border-dashed border-border/60 px-3 py-2 text-[12px] text-muted-foreground">
          未選客戶——不帶歷史價（結算前可補客戶）
        </div>
      )}

      {/* 量價輸入：量 Enter → 價 Enter ＝ 加入報價、退回搜尋窗查下一顆 */}
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-[11px] text-muted-foreground">數量</span>
          <input
            ref={qtyRef}
            type="number"
            min="0"
            step="1"
            value={qty}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setQty(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                priceRef.current?.focus();
              }
            }}
            className={inputCls}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[11px] text-muted-foreground">報價單價</span>
          <input
            ref={priceRef}
            type="number"
            min="0"
            step="0.01"
            value={price}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (Number(qty) > 0 && price !== '' && Number(price) >= 0) onCommit(qty, price);
              }
            }}
            className={`${inputCls} font-semibold`}
          />
        </label>
        <button
          type="button"
          disabled={!(Number(qty) > 0 && price !== '' && Number(price) >= 0)}
          onClick={() => onCommit(qty, price)}
          className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          title="加入本次報價（價欄 Enter 同效）"
        >
          {existing ? '更新' : '加入'}
        </button>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground/75">
        <span>
          {code ? (
            <>
              <span className="font-mono">{code}</span>　可出 <span className={available > 0 ? 'text-[#22D88F]' : 'text-destructive'}>{available}</span>
              {short ? <span className="ml-1 text-amber-600">缺 {Number(qty) - available}（調貨/客訂）</span> : null}
            </>
          ) : (
            '載入中…'
          )}
        </span>
        <span>價 Enter＝加入並查下一顆</span>
      </div>
    </div>
  );
}

/** 結算窗：清單覆核 → 給客戶的訊息複製 → 存 N 筆報價紀錄（未選客戶可在這補）*/
function QuoteSessionSummary({
  customer,
  lines,
  onPickCustomer,
  onRemoveLine,
  onResume,
  onFinish,
}: {
  customer: PickedCustomer | null;
  lines: SessionLine[];
  onPickCustomer: (c: PickedCustomer) => void;
  onRemoveLine: (partId: string) => void;
  onResume: () => void;
  onFinish: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const saved = savedCount !== null;

  const copyText = useMemo(
    () =>
      lines
        .map((l) => {
          const qtyPart = Number(l.qty) > 1 ? `　數量 ${Number(l.qty)}` : '';
          return `${l.code} ${l.name}${qtyPart}　報價 NT$ ${formatNt(Number(l.price))}`;
        })
        .join('\n'),
    [lines],
  );

  async function save() {
    if (!customer) return;
    setBusy(true);
    setErr(null);
    try {
      for (const l of lines) {
        await createQuoteRecord({
          customerId: customer.id,
          partId: l.partId,
          qty: Number(l.qty),
          unitPrice: Number(l.price),
          warehouseId: customer.defaultWarehouseId ?? undefined,
          source: 'INSTANT',
        });
      }
      setSavedCount(lines.length);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '報價紀錄儲存失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <FocusLockedDialog
      open
      onClose={saved ? onFinish : onResume}
      ariaLabel="報價結算"
      backdropClassName="bg-black/55 backdrop-blur-sm animate-in fade-in duration-150"
      dialogClassName="flex flex-col rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55),0_0_50px_-18px_rgba(232,160,32,0.22)] animate-in fade-in zoom-in-95 duration-150"
      dialogStyle={{ width: 'min(720px, 96vw)', maxHeight: 'min(720px, 92vh)' }}
    >
      <>
        <div className="flex items-center gap-2.5 border-b border-border/40 px-6 py-3">
          <FilePlus className="size-[18px] text-primary" />
          <h2 className="text-[15px] font-semibold tracking-wide">報價結算</h2>
          <span className="text-[12px] text-muted-foreground">
            {customer ? (
              <>
                <span className="font-mono">{customer.code}</span> {customer.name}
              </>
            ) : (
              '散客／未選客戶'
            )}
            ・{lines.length} 顆
          </span>
          <button
            type="button"
            onClick={saved ? onFinish : onResume}
            className="ml-auto rounded-md border border-border/40 bg-background/40 p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            aria-label="關閉"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-auto px-6 py-4">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-left">料號／品名</th>
                <th className="w-16 px-2 py-1.5 text-right">數量</th>
                <th className="w-24 px-2 py-1.5 text-right">單價</th>
                {!saved ? <th className="w-10 px-2 py-1.5"></th> : null}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.partId} className="border-b border-border/40 last:border-b-0">
                  <td className="px-2 py-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{l.code}</span>
                    <span className="ml-2">{l.name}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{l.qty}</td>
                  <td className="px-2 py-1.5 text-right font-medium tabular-nums">{formatNt(Number(l.price))}</td>
                  {!saved ? (
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveLine(l.partId)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="移除"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>

          {copyText ? (
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">給客戶的訊息（複製貼通訊軟體）</span>
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
                readOnly
                rows={Math.min(6, Math.max(2, copyText.split('\n').length))}
                value={copyText}
                className="w-full resize-y rounded-md border border-border bg-muted/20 px-2 py-2 font-mono text-[11px] leading-relaxed text-foreground"
              />
            </div>
          ) : null}

          {!customer && !saved ? (
            <div className="space-y-2 rounded-lg border border-dashed border-border px-4 py-3">
              <div className="text-[12px] text-muted-foreground">
                未選客戶：訊息可以直接複製；<b className="text-foreground">要存報價紀錄得先補客戶</b>（新客戶先去 基本資料→往來對象 建檔）
              </div>
              <CustomerPicker onPick={onPickCustomer} onCommit={() => {}} />
            </div>
          ) : null}

          {err ? <div className="text-xs text-destructive">{err}</div> : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/35 bg-background/35 px-6 py-3">
          {saved ? (
            <>
              <span className="mr-auto text-sm text-[#22D88F]">✅ 已存 {savedCount} 筆報價紀錄</span>
              <button type="button" onClick={onFinish} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground">
                關閉
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onResume} className="mr-auto rounded border px-4 py-1.5 text-sm">
                ← 回去繼續報
              </button>
              <button
                type="button"
                onClick={onFinish}
                className="rounded border border-destructive/40 px-4 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                title="不存紀錄、清空本次清單"
              >
                {customer ? '放棄不存' : '只複製、不存紀錄'}
              </button>
              <button
                type="button"
                disabled={busy || !customer || lines.length === 0}
                onClick={() => void save()}
                className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                {busy ? '儲存中…' : `完成報價（存 ${lines.length} 筆紀錄）`}
              </button>
            </>
          )}
        </div>
      </>
    </FocusLockedDialog>
  );
}
