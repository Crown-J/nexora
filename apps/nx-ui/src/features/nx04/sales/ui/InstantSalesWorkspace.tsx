// apps/nx-ui/src/features/nx04/sales/ui/InstantSalesWorkspace.tsx
// F2 即時工作檯・站 4「即時銷售」——成交快速建單精靈（5 步 客戶→明細→交易→出貨→訊息）
//
// 拍板（執行長 2026-07-18）：
//   · 站 4 = 即時銷售、原「即時補貨」順延站 5（station-registry.ts）
//   · 精靈只做到「建單 + 確認」→ 落撿貨清單、倉庫接手後續（不在此撿貨/出貨）
// 範式對齊 F5 調貨詢價（GlobalTransferInquiry）：單一元件內 stage(1~5) 切步、
//   左 52px 流程軌 + 中主區 + 右副區、FocusLockedDialog 全螢幕、Alt+1~5 跳步、Enter 走到底。
// 後端：POST /nx04/so（DRAFT）→ PATCH status=CONFIRMED；零 schema、沿用現成端點。
//
// commit 2：步驟 1 客戶（CustomerPicker）+ 步驟 2 明細（PartPicker + 數量/價格）+ 右側訂單摘要。
//   步驟 3/4/5 仍為佔位（後續 commit）。
'use client';

import { ClipboardCheck, ListPlus, MessageSquareText, ReceiptText, Star, Trash2, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { listWarehouses, type WarehouseDto } from '@data/endpoints/nx01/api/warehouse';
import { lookupStockBalance } from '@data/endpoints/nx03/stock-balance/api/lookup';
import { getQuotePriceIntel } from '@data/endpoints/nx04/quote/api/quote';
import { createQuoteRecord } from '@data/endpoints/nx04/record/api/record';
import { createSo, softDeleteSo, updateSo } from '@data/endpoints/nx04/so/api/so';
import { getPartner } from '@data/endpoints/shared/master/partner/api/partner';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

import { CustomerPicker, type PickedCustomer } from '@/features/nx04/quote/ui/CustomerPicker';
import { PartPicker, type PickedPart } from '@/features/nx04/quote/ui/PartPicker';

/** 站內步驟號（5 步；與 SO 建單流程對應） */
type SalesStage = 1 | 2 | 3 | 4 | 5;

type StageDef = { n: SalesStage; label: string; icon: ReactNode; hint: string };

const STAGE_DEFS: StageDef[] = [
  { n: 1, label: '客戶', icon: <UserRound size={18} />, hint: '選擇客戶' },
  { n: 2, label: '明細', icon: <ListPlus size={18} />, hint: '品項・數量・價格・從哪出' },
  { n: 3, label: '交易', icon: <ReceiptText size={18} />, hint: '付款・發票・帳期・取貨方式' },
  { n: 4, label: '確認', icon: <ClipboardCheck size={18} />, hint: '覆核・自動拆單' },
  { n: 5, label: '訊息', icon: <MessageSquareText size={18} />, hint: '確認・訊息內容' },
];

/** 出貨分配來源：現貨（本倉可出）/ 等調撥（自倉調撥、系統配來源倉） */
export type AllocSource = 'STOCK' | 'TRANSFER';
/** 一筆出貨分配：某倉出某數量（來源決定現貨 or 等調撥） */
export type Allocation = {
  warehouseId: string;
  qty: number;
  source: AllocSource;
};

/** 建單草稿的明細行；allocations 加總須等於 qty（Step2 出貨分配） */
export type SalesLine = {
  partId: string;
  partNo: string;
  partName: string;
  brandName: string | null;
  availableTotal: string;
  qty: number;
  unitPrice: number;
  remark: string;
  /** 選料時本客戶是否已有近一月報價紀錄；false → 建單送出時自動生成即時報價紀錄（送出步驟） */
  hadQuoteRecord: boolean;
  /** 出貨分配（現貨/等調撥）；建單送出時每筆 → 一張銷貨明細行 */
  allocations: Allocation[];
};

/** 依「客戶預設倉可用量」自動拆分配：足→現貨一筆；不足→現貨+調撥；無→調撥 */
function autoAllocate(warehouseId: string, qty: number, avail: number): Allocation[] {
  if (avail >= qty) return [{ warehouseId, qty, source: 'STOCK' }];
  if (avail <= 0) return [{ warehouseId, qty, source: 'TRANSFER' }];
  return [
    { warehouseId, qty: avail, source: 'STOCK' },
    { warehouseId, qty: qty - avail, source: 'TRANSFER' },
  ];
}

const nf = new Intl.NumberFormat('zh-TW');
const money = (n: number) => `$${nf.format(Math.round(n))}`;

/** 付款條件（步驟 3；直接列具體值，客戶主檔預設那顆標星號）*/
const PAYMENT_TERMS: { v: string; label: string }[] = [
  { v: 'CASH', label: '現金' },
  { v: 'PREPAY', label: '預付' },
  { v: 'NET30', label: '月結 30 天' },
  { v: 'NET60', label: '月結 60 天' },
  { v: 'NET90', label: '月結 90 天' },
];
/** 付款條件代碼 → 中文（客戶預設值落在標準清單外時仍能顯示）*/
const paymentTermLabel = (v: string): string => PAYMENT_TERMS.find((t) => t.v === v)?.label ?? v;
/** 發票種類（invoiceCopies；0 不開 / 2 二聯 / 3 三聯）*/
const INVOICE_OPTS: { v: number; label: string }[] = [
  { v: 3, label: '三聯' },
  { v: 2, label: '二聯' },
  { v: 0, label: '不開發票' },
];
/** 取貨方式（deliveryType；後端權威 P/D/C）*/
const DELIVERY_OPTS: { v: string; label: string }[] = [
  { v: 'P', label: '自取' },
  { v: 'D', label: '配送' },
  { v: 'C', label: '寄貨' },
];

/** 選客戶時一併帶回的預設值（結帳日/預設發票聯式/付款條件）*/
type CustomerDefaults = {
  statementDay: number | null;
  defaultInvoiceCopies: number | null;
  paymentTermDomestic: string;
};

/** 帳期預設（YYYY-MM）：今天日 > 客戶結帳日 → 切下月帳，否則本月 */
function defaultAccountPeriod(statementDay: number | null | undefined): string {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth(); // 0-based
  if (statementDay && now.getDate() > statementDay) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

/** 稅率：不開發票（invoiceCopies=0）→ 0%，否則 5%（營業稅） */
const taxRateOf = (invoiceCopies: number) => (invoiceCopies === 0 ? 0 : 5);

/** 建單結果（Step 5 顯示用） */
type OrderResult = { docNo: string; stockLines: number; transferLines: number };

/** Step 5 客戶訊息可設定顯示項（存 localStorage） */
type MsgOpts = { partNo: boolean; partName: boolean; qty: boolean; price: boolean; ship: boolean; remark: boolean };
const MSG_OPTS_KEY = 'nx-instant-sales-msg-opts';
const DEFAULT_MSG_OPTS: MsgOpts = { partNo: true, partName: true, qty: true, price: true, ship: true, remark: false };
const MSG_OPT_DEFS: { key: keyof MsgOpts; label: string }[] = [
  { key: 'partNo', label: '料號' },
  { key: 'partName', label: '品名' },
  { key: 'qty', label: '數量' },
  { key: 'price', label: '單價' },
  { key: 'ship', label: '出貨狀態（現貨/等調撥）' },
  { key: 'remark', label: '備註' },
];

/** 依顯示設定組客戶訊息文字 */
function buildMessage(
  customerName: string,
  docNo: string,
  lines: SalesLine[],
  opts: MsgOpts,
  invoiceCopies: number,
): string {
  const rows = lines.map((l) => {
    const seg: string[] = [];
    if (opts.partNo) seg.push(l.partNo);
    if (opts.partName) seg.push(l.partName);
    if (opts.qty) seg.push(`×${nf.format(l.qty)}`);
    if (opts.price) seg.push(money(l.unitPrice));
    if (opts.ship) seg.push(l.allocations.some((a) => a.source === 'TRANSFER') ? '（等調撥）' : '（現貨）');
    if (opts.remark && l.remark) seg.push(`※${l.remark}`);
    return `・${seg.join(' ')}`;
  });
  const subtotal = lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const total = subtotal + Math.round((subtotal * taxRateOf(invoiceCopies)) / 100);
  return [`【${customerName}】${docNo}`, ...rows, `合計（含稅）${money(total)}`].join('\n');
}

/** 對外：受控元件，殼以 open/onClosed 掛載（比照 GlobalTransferInquiry） */
export function InstantSalesWorkspace({ open, onClosed }: { open: boolean; onClosed: () => void }) {
  if (!open) return null;
  return <InstantSalesDialog onClose={onClosed} />;
}

function InstantSalesDialog({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<SalesStage>(1);
  // ── 建單草稿 ──
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [custDefaults, setCustDefaults] = useState<CustomerDefaults | null>(null);
  const [lines, setLines] = useState<SalesLine[]>([]);
  const [paymentTerm, setPaymentTerm] = useState(''); // '' = 客戶預設
  const [invoiceCopies, setInvoiceCopies] = useState(3);
  const [accountPeriod, setAccountPeriod] = useState(() => defaultAccountPeriod(null));
  const [deliveryType, setDeliveryType] = useState('P');
  // 送出/結果
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  // Step 5 客戶訊息顯示設定（localStorage）
  const [msgOpts, setMsgOpts] = useState<MsgOpts>(DEFAULT_MSG_OPTS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MSG_OPTS_KEY);
      if (raw) setMsgOpts({ ...DEFAULT_MSG_OPTS, ...JSON.parse(raw) });
    } catch {
      /* 讀不到用預設 */
    }
  }, []);
  const setMsgOpt = useCallback((patch: Partial<MsgOpts>) => {
    setMsgOpts((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(MSG_OPTS_KEY, JSON.stringify(next));
      } catch {
        /* 存不了不擋 */
      }
      return next;
    });
  }, []);
  // 開站/回步驟 1 時聚焦客戶搜尋框（修：開站需滑鼠點框才能打字）
  const customerInputRef = useRef<HTMLInputElement>(null);

  // 送出：驗配平 → 建 SO（分配攤成明細行）→ 確認（觸發自動調撥單）→ 成功後補報價紀錄
  // 冪等（2026-07-18 全面測試修正）：確認失敗 → 草稿自動作廢、重試不留孤兒；報價紀錄挪到成功後、重試不重複
  const buildOrder = useCallback(async () => {
    if (!customer || submitting || orderResult) return; // 已建單不重送
    // 0. 守門：每行分配需配平、每筆分配量 > 0 且有倉（Alt+數字跳步可繞過 Step2 守門、這裡兜底）
    const bad = lines.find(
      (l) =>
        l.allocations.length === 0 ||
        l.allocations.some((a) => !(a.qty > 0) || !a.warehouseId) ||
        l.allocations.reduce((s, a) => s + a.qty, 0) !== l.qty,
    );
    if (lines.length === 0 || bad) {
      setSubmitError(bad ? `品項 ${bad.partNo} 出貨分配未配平（回步驟 2 調整）` : '沒有品項');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      // 1. 分配攤成明細行（現貨=S、等調撥=T）
      const items = lines.flatMap((l) =>
        l.allocations.map((a) => ({
          partId: l.partId,
          warehouseId: a.warehouseId,
          qty: a.qty,
          unitPriceSnapshot: l.unitPrice,
          transferSourceType: a.source === 'TRANSFER' ? 'T' : 'S',
          belowMinReason: '即時銷售',
          remark: l.remark || undefined,
        })),
      );
      const headerWh = lines[0]?.allocations[0]?.warehouseId ?? customer.defaultWarehouseId ?? undefined;
      const soDate = new Date().toISOString().slice(0, 10);
      const so = await createSo({
        customerId: customer.id,
        warehouseId: headerWh ?? undefined,
        soDate,
        deliveryType,
        taxRate: taxRateOf(invoiceCopies),
        invoiceCopies,
        paymentTerm: paymentTerm || undefined,
        accountPeriod: accountPeriod ? `${accountPeriod}-01` : undefined,
        salesMethod: '即時銷售',
        items,
      });
      // 2. 確認 → CONFIRMED（後端對 T 行自動開調撥單 ST）；失敗把草稿作廢、避免重試堆孤兒 DRAFT
      try {
        await updateSo(so.id, { status: 'CONFIRMED' });
      } catch (confirmErr) {
        await softDeleteSo(so.id, '即時銷售確認失敗自動作廢').catch(() => undefined);
        throw confirmErr;
      }
      // 3. 確認成功後、對「無近一月報價紀錄」的行補即時報價紀錄（失敗不擋單）
      await Promise.all(
        lines
          .filter((l) => !l.hadQuoteRecord)
          .map((l) =>
            createQuoteRecord({
              customerId: customer.id,
              partId: l.partId,
              qty: l.qty,
              unitPrice: l.unitPrice,
              warehouseId: l.allocations[0]?.warehouseId,
              source: 'INSTANT',
              sourceDocId: so.id,
            }).catch(() => undefined),
          ),
      );
      const transferLines = items.filter((it) => it.transferSourceType === 'T').length;
      setOrderResult({ docNo: so.docNo, stockLines: items.length - transferLines, transferLines });
      setStage(5);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '建單失敗');
    } finally {
      setSubmitting(false);
    }
  }, [customer, submitting, orderResult, lines, deliveryType, invoiceCopies, paymentTerm, accountPeriod]);

  // 選客戶 → 帶回客戶預設（結帳日算帳期、發票聯式、付款條件提示）
  const handlePickCustomer = useCallback((c: PickedCustomer) => {
    setCustomer(c);
    getPartner(c.id)
      .then((p) => {
        const d: CustomerDefaults = {
          statementDay: p.statementDay ?? null,
          defaultInvoiceCopies: p.defaultInvoiceCopies ?? null,
          paymentTermDomestic: p.paymentTermDomestic,
        };
        setCustDefaults(d);
        setInvoiceCopies(d.defaultInvoiceCopies ?? 3);
        setPaymentTerm(d.paymentTermDomestic || 'CASH');
        setAccountPeriod(defaultAccountPeriod(d.statementDay));
      })
      .catch(() => {
        /* 帶不到預設不擋、留手選 */
      });
  }, []);

  // Alt+1~5 直接跳步（全域 capture，比照 F5）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 5) {
        e.preventDefault();
        e.stopPropagation();
        setStage(n as SalesStage);
      }
    };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, []);

  const cur = STAGE_DEFS.find((s) => s.n === stage)!;

  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel="即時銷售"
      initialFocusRef={customerInputRef}
      backdropClassName="bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-150"
      dialogClassName="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in-95 duration-150"
      dialogStyle={{ width: 'min(1080px, 96vw)', height: 'min(680px, 92vh)' }}
    >
      {/* header */}
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2.5">
        <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_#02EDAB]" />
        <h2 className="text-sm font-bold tracking-wide">即時銷售</h2>
        <span className="text-[11px] text-muted-foreground">・成交快速建單</span>
        {customer ? (
          <span className="ml-3 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {customer.code}　{customer.name}
          </span>
        ) : null}
        <kbd className="ml-auto rounded border border-border/60 bg-background/60 px-1.5 font-mono text-[10px] text-muted-foreground">
          F2
        </kbd>
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      {/* body：52px 流程軌 | 主區 | 副區 */}
      <div className="grid min-h-0 flex-1 grid-cols-[52px_minmax(360px,1fr)_minmax(320px,1fr)]">
        {/* 流程軌 */}
        <nav className="relative flex flex-col items-center justify-evenly border-r border-border/40 py-6">
          <span aria-hidden className="absolute bottom-12 left-1/2 top-12 w-[2px] -translate-x-1/2 bg-border/70" />
          {STAGE_DEFS.map((s) => {
            const active = s.n === stage;
            const done = s.n < stage;
            return (
              <button
                key={s.n}
                type="button"
                onClick={() => setStage(s.n)}
                title={`${s.label}（Alt+${s.n}）`}
                className={
                  active
                    ? 'relative z-10 grid size-10 place-items-center rounded-full border-2 border-primary bg-primary/20 text-primary shadow-[0_0_12px_rgba(2,237,171,0.35)]'
                    : done
                      ? 'relative z-10 grid size-10 place-items-center rounded-full border-2 border-primary/50 bg-primary/8 text-primary/70 hover:text-primary'
                      : 'relative z-10 grid size-10 place-items-center rounded-full border-2 border-border/60 bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }
              >
                {s.icon}
                <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full border border-border/60 bg-background font-mono text-[9px] text-muted-foreground">
                  {s.n}
                </span>
              </button>
            );
          })}
        </nav>

        {/* 主區：依 stage 切內容 */}
        <section className="flex min-h-0 flex-col overflow-hidden p-5">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-base font-bold">
              {cur.n}. {cur.label}
            </span>
            <span className="text-[12px] text-muted-foreground">{cur.hint}</span>
          </div>

          {stage === 1 ? (
            <CustomerStep
              customer={customer}
              inputRef={customerInputRef}
              onPick={handlePickCustomer}
              onNext={() => setStage(2)}
            />
          ) : stage === 2 ? (
            <ItemsStep customer={customer} lines={lines} setLines={setLines} onNext={() => setStage(3)} />
          ) : stage === 3 ? (
            <TransactionStep
              custDefaults={custDefaults}
              paymentTerm={paymentTerm}
              setPaymentTerm={setPaymentTerm}
              invoiceCopies={invoiceCopies}
              setInvoiceCopies={setInvoiceCopies}
              accountPeriod={accountPeriod}
              setAccountPeriod={setAccountPeriod}
              deliveryType={deliveryType}
              setDeliveryType={setDeliveryType}
              onNext={() => setStage(4)}
            />
          ) : stage === 4 ? (
            <ConfirmStep
              customer={customer}
              lines={lines}
              deliveryType={deliveryType}
              invoiceCopies={invoiceCopies}
              submitting={submitting}
              submitError={submitError}
              onSubmit={buildOrder}
            />
          ) : (
            <MessageStep
              customer={customer}
              lines={lines}
              invoiceCopies={invoiceCopies}
              result={orderResult}
              msgOpts={msgOpts}
              onClose={onClose}
            />
          )}
        </section>

        {/* 副區：Step 5 顯示訊息設定、其餘顯示訂單摘要 */}
        <aside className="flex min-h-0 flex-col overflow-auto border-l border-border/40 p-5">
          {stage === 5 ? (
            <MessageOptionsPanel opts={msgOpts} onChange={setMsgOpt} />
          ) : (
            <OrderSummary customer={customer} lines={lines} invoiceCopies={invoiceCopies} />
          )}
        </aside>
      </div>

      {/* footer 快捷鍵提示 */}
      <div className="border-t border-border/40 px-4 py-2 text-[11px] text-muted-foreground">
        Alt+1~5 跳步・Enter 下一步・Esc 關閉
      </div>
    </FocusLockedDialog>
  );
}

/** 步驟 1：客戶 */
function CustomerStep({
  customer,
  inputRef,
  onPick,
  onNext,
}: {
  customer: PickedCustomer | null;
  inputRef: React.Ref<HTMLInputElement>;
  onPick: (c: PickedCustomer) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <CustomerPicker onPick={onPick} onCommit={() => customer && onNext()} autoFocus partnerType="C" inputRef={inputRef} />
      {customer ? (
        <div className="rounded-xl border border-primary/40 bg-primary/8 p-3">
          <div className="text-[11px] text-muted-foreground">已選客戶</div>
          <div className="mt-0.5 text-sm font-bold text-primary">
            {customer.code}　{customer.name}
          </div>
          {customer.defaultWarehouseName ? (
            <div className="mt-1 text-[11px] text-muted-foreground">
              預設出貨倉：{customer.defaultWarehouseName}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-[12px] text-muted-foreground">輸入客戶編號或名稱搜尋（Alt+Z 注音首碼）。</div>
      )}
      <div className="mt-auto flex justify-end">
        <button
          type="button"
          disabled={!customer}
          onClick={onNext}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          下一步：明細 →
        </button>
      </div>
    </div>
  );
}

/** 步驟 2：明細（加品項 → 數量/單價/備註 → 加入；單價自動帶價 + 出貨分配現貨/調撥） */
function ItemsStep({
  customer,
  lines,
  setLines,
  onNext,
}: {
  customer: PickedCustomer | null;
  lines: SalesLine[];
  setLines: React.Dispatch<React.SetStateAction<SalesLine[]>>;
  onNext: () => void;
}) {
  const [pending, setPending] = useState<PickedPart | null>(null);
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [remark, setRemark] = useState('');
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceSource, setPriceSource] = useState<string | null>(null);
  const [hadRecord, setHadRecord] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [whs, setWhs] = useState<WarehouseDto[]>([]);
  const qtyRef = useRef<HTMLInputElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const defaultWhRef = useRef<string | null>(customer?.defaultWarehouseId ?? null);

  // 載入倉庫清單 + 決定預設出貨倉（客戶預設倉 → 主倉 → 第一個）
  useEffect(() => {
    let alive = true;
    listWarehouses({ page: 1, pageSize: 200, isActive: true })
      .then((res) => {
        if (!alive) return;
        setWhs(res.items);
        defaultWhRef.current =
          customer?.defaultWarehouseId ?? res.items.find((w) => w.isMain)?.id ?? res.items[0]?.id ?? null;
      })
      .catch(() => {
        /* 載入失敗不擋 */
      });
    return () => {
      alive = false;
    };
  }, [customer]);

  const whName = (id: string) => {
    const w = whs.find((x) => x.id === id);
    return w ? `${w.code}　${w.name}` : id;
  };

  // Alt+S 存檔 → 跳確認視窗（配平才可進下一步）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      e.stopPropagation();
      const ls = linesRef.current;
      if (ls.length > 0 && ls.every((l) => l.allocations.reduce((a, x) => a + x.qty, 0) === l.qty)) {
        setConfirmOpen(true);
      }
    };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, []);

  // 選料 → 自動帶價（沿用即時報價範式）
  const pickPart = async (p: PickedPart) => {
    setPending(p);
    setQty('1');
    setPrice('');
    setRemark('');
    setPriceSource(null);
    setHadRecord(false);
    setTimeout(() => qtyRef.current?.focus(), 0);
    if (!customer) return;
    setPriceLoading(true);
    try {
      const intel = await getQuotePriceIntel(customer.id, p.id);
      const cq = intel.sameCustomerQuote;
      const cs = intel.sameCustomerSale;
      const recent = cq && cs ? (cq.date >= cs.date ? cq : cs) : (cq ?? cs);
      setPrice(recent?.amount ?? intel.suggestedPrice ?? '');
      setPriceSource(recent ? (recent === cq ? '近一月報價' : '近一月成交') : intel.suggestedPrice ? '建議售價' : null);
      setHadRecord(!!cq);
    } catch {
      /* 查不到不擋 */
    } finally {
      setPriceLoading(false);
    }
  };

  // 加入 → 查客戶預設倉庫存、自動拆現貨/調撥
  const addLine = async () => {
    if (!pending) return;
    const q = Number(qty);
    const pr = Number(price);
    if (!(q > 0) || !(pr >= 0) || price.trim() === '') return;
    const p = pending;
    const wh = defaultWhRef.current ?? whs[0]?.id ?? '';
    let allocations: Allocation[] = [{ warehouseId: wh, qty: q, source: 'STOCK' }];
    if (wh) {
      try {
        const bal = await lookupStockBalance(p.id, wh);
        allocations = autoAllocate(wh, q, bal?.availableQty ?? 0);
      } catch {
        /* 查不到 → 單筆現貨、業務手調 */
      }
    }
    setLines((prev) => [
      ...prev,
      {
        partId: p.id,
        partNo: p.code,
        partName: p.name,
        brandName: p.brandName,
        availableTotal: p.availableTotal,
        qty: q,
        unitPrice: pr,
        remark: remark.trim(),
        hadQuoteRecord: hadRecord,
        allocations,
      },
    ]);
    setPending(null);
    setQty('1');
    setPrice('');
    setRemark('');
    setPriceSource(null);
    setHadRecord(false);
    setPickerKey((k) => k + 1);
  };

  // 分配編輯
  const updateAlloc = (li: number, ai: number, patch: Partial<Allocation>) =>
    setLines((prev) =>
      prev.map((l, i) =>
        i !== li ? l : { ...l, allocations: l.allocations.map((a, j) => (j !== ai ? a : { ...a, ...patch })) },
      ),
    );
  const addAlloc = (li: number) =>
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== li) return l;
        const wh = defaultWhRef.current ?? whs[0]?.id ?? '';
        return { ...l, allocations: [...l.allocations, { warehouseId: wh, qty: 0, source: 'STOCK' as AllocSource }] };
      }),
    );
  const removeAlloc = (li: number, ai: number) =>
    setLines((prev) =>
      prev.map((l, i) =>
        i !== li ? l : l.allocations.length <= 1 ? l : { ...l, allocations: l.allocations.filter((_, j) => j !== ai) },
      ),
    );
  // 換倉 → 重查該倉庫存、自動判現貨/調撥（治「選 A 但 A 沒貨＝等調撥」）
  const changeAllocWh = async (li: number, ai: number, whId: string) => {
    const alloc = linesRef.current[li]?.allocations[ai];
    const partId = linesRef.current[li]?.partId;
    updateAlloc(li, ai, { warehouseId: whId });
    if (!alloc || !partId) return;
    try {
      const bal = await lookupStockBalance(partId, whId);
      updateAlloc(li, ai, { source: (bal?.availableQty ?? 0) >= alloc.qty ? 'STOCK' : 'TRANSFER' });
    } catch {
      /* 查不到 → 保留現值 */
    }
  };

  const allocSum = (l: SalesLine) => l.allocations.reduce((a, x) => a + x.qty, 0);
  const allBalanced = lines.length > 0 && lines.every((l) => allocSum(l) === l.qty);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* 加品項列 */}
      <div className="rounded-xl border border-border/50 bg-background/40 p-3">
        <PartPicker key={pickerKey} onPick={pickPart} autoFocus />
        {pending ? (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium">
                  {pending.code}　{pending.name}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {pending.brandName ?? '—'}・可出 {pending.availableTotal}
                </div>
              </div>
              <label className="flex flex-col text-[10px] text-muted-foreground">
                數量
                <input
                  ref={qtyRef}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), document.getElementById('is-price')?.focus())}
                  inputMode="decimal"
                  className="w-16 rounded border border-border/60 bg-background px-2 py-1 text-right text-sm text-foreground"
                />
              </label>
              <label className="flex flex-col text-[10px] text-muted-foreground">
                單價
                <input
                  id="is-price"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setPriceSource('手動');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), document.getElementById('is-remark')?.focus())}
                  inputMode="decimal"
                  placeholder={priceLoading ? '帶價中…' : '0'}
                  className="w-20 rounded border border-border/60 bg-background px-2 py-1 text-right text-sm text-foreground"
                />
              </label>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex flex-1 flex-col text-[10px] text-muted-foreground">
                備註
                <input
                  id="is-remark"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void addLine())}
                  placeholder="選填"
                  className="w-full rounded border border-border/60 bg-background px-2 py-1 text-sm text-foreground"
                />
              </label>
              <button
                type="button"
                onClick={() => void addLine()}
                className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-bold text-primary-foreground"
              >
                加入
              </button>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {priceSource ? `單價來源：${priceSource}` : priceLoading ? '查詢報價中…' : '　'}
              {!hadRecord && !priceLoading ? '・建單時自動生成即時報價紀錄' : ''}
            </div>
          </div>
        ) : (
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            搜尋料號加入，選定後自動帶價、填數量/備註，Enter 一路到加入。加入後在下方配「從哪出」。
          </div>
        )}
      </div>

      {/* 明細清單（每品項一卡 + 出貨分配） */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
        {lines.length === 0 ? (
          <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-border/40 text-[12px] text-muted-foreground">
            尚無品項
          </div>
        ) : (
          lines.map((l, li) => {
            const sum = allocSum(l);
            const balanced = sum === l.qty;
            return (
              <div key={li} className="rounded-xl border border-border/50 p-2.5">
                {/* 品項頭 */}
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium">{l.partNo}</div>
                    <div className="text-[11px] text-muted-foreground">{l.partName}</div>
                    {l.remark ? <div className="text-[11px] text-amber-600">※ {l.remark}</div> : null}
                  </div>
                  <div className="text-right text-[12px]">
                    <div className="tabular-nums">
                      {nf.format(l.qty)} × {money(l.unitPrice)}
                    </div>
                    <div className="font-bold tabular-nums">{money(l.qty * l.unitPrice)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((_, j) => j !== li))}
                    aria-label="移除品項"
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* 出貨分配 */}
                <div className="mt-2 border-t border-border/30 pt-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">出貨分配</span>
                    <span className={balanced ? 'text-[10px] text-primary' : 'text-[10px] font-bold text-destructive'}>
                      已配 {nf.format(sum)}/{nf.format(l.qty)}
                      {balanced ? ' ✓' : ' ⚠'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {l.allocations.map((a, ai) => (
                      <div key={ai} className="flex items-center gap-1.5">
                        <select
                          value={a.warehouseId}
                          onChange={(e) => void changeAllocWh(li, ai, e.target.value)}
                          className="min-w-0 flex-1 rounded border border-border/60 bg-background px-1.5 py-1 text-[12px] text-foreground"
                        >
                          {whs.length === 0 ? <option value={a.warehouseId}>{whName(a.warehouseId)}</option> : null}
                          {whs.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.code}　{w.name}
                            </option>
                          ))}
                        </select>
                        <input
                          value={String(a.qty)}
                          onChange={(e) => updateAlloc(li, ai, { qty: Math.max(0, Number(e.target.value) || 0) })}
                          inputMode="decimal"
                          className="w-14 rounded border border-border/60 bg-background px-1.5 py-1 text-right text-[12px] text-foreground"
                        />
                        <div className="flex overflow-hidden rounded border border-border/60">
                          {(['STOCK', 'TRANSFER'] as AllocSource[]).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => updateAlloc(li, ai, { source: s })}
                              className={
                                a.source === s
                                  ? s === 'TRANSFER'
                                    ? 'bg-amber-500/20 px-2 py-1 text-[11px] font-bold text-amber-700'
                                    : 'bg-primary/15 px-2 py-1 text-[11px] font-bold text-primary'
                                  : 'px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/40'
                              }
                            >
                              {s === 'STOCK' ? '現貨' : '調撥'}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAlloc(li, ai)}
                          disabled={l.allocations.length <= 1}
                          aria-label="刪分配"
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addAlloc(li)}
                    className="mt-1.5 rounded border border-dashed border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  >
                    ＋ 分配（拆倉／調撥）
                  </button>
                  {l.allocations.some((a) => a.source === 'TRANSFER') ? (
                    <span className="ml-2 text-[10px] text-amber-600">含等調撥・建單時自動開調撥單</span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between">
        {!customer ? (
          <span className="text-[11px] text-amber-600">尚未選客戶（步驟 1），無法自動帶價</span>
        ) : !allBalanced && lines.length > 0 ? (
          <span className="text-[11px] text-destructive">有品項分配未配平，配平才能進下一步</span>
        ) : (
          <span className="text-[11px] text-muted-foreground">Alt+S 存檔並進下一步</span>
        )}
        <button
          type="button"
          disabled={!allBalanced}
          onClick={() => setConfirmOpen(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          下一步：交易 →
        </button>
      </div>

      {/* Alt+S / 下一步 → 明細確認視窗（確認後進交易步驟） */}
      {confirmOpen ? (
        <FocusLockedDialog
          open
          onClose={() => setConfirmOpen(false)}
          initialFocusRef={confirmBtnRef}
          ariaLabel="確認明細"
          backdropClassName="bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-100"
          dialogClassName="w-[360px] rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="p-4">
            <h3 className="text-sm font-bold">確認明細</h3>
            <div className="mt-2 space-y-1 text-[13px]">
              <div>
                <span className="text-muted-foreground">客戶　</span>
                {customer ? `${customer.code}　${customer.name}` : '—'}
              </div>
              <div>
                <span className="text-muted-foreground">品項　</span>
                {lines.length} 項・總數量 {nf.format(lines.reduce((a, l) => a + l.qty, 0))}
              </div>
              <div>
                <span className="text-muted-foreground">金額　</span>
                <span className="font-bold text-primary">
                  {money(lines.reduce((a, l) => a + l.qty * l.unitPrice, 0))}
                </span>
                （未稅）
              </div>
            </div>
            <p className="mt-3 text-[12px] text-muted-foreground">確認後進入「交易」設定。</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-border/60 px-3 py-1.5 text-sm hover:bg-muted/40"
              >
                取消
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  onNext();
                }}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground"
              >
                確認 →
              </button>
            </div>
          </div>
        </FocusLockedDialog>
      ) : null}
    </div>
  );
}

/** 選項膠囊組（付款/發票/取貨共用；鍵盤 radiogroup：←→↑↓ 選、Tab 進出、預設值標示） */
function PillGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  hint,
  defaultValue,
  autoFocusGroup,
  onEnter,
  containerRef,
}: {
  label: string;
  options: { v: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  hint?: string;
  /** 客戶預設值 → 該顆標「預設」徽章 + 底色，讓業務知道停在預設上 */
  defaultValue?: T;
  /** 進站聚焦此組（步驟第一組用） */
  autoFocusGroup?: boolean;
  /** Enter → 前進下一欄（父層聚焦下一個欄位） */
  onEnter?: () => void;
  /** 外部拿 radiogroup 容器（父層 Enter 前進時聚焦本組選中顆用） */
  containerRef?: React.Ref<HTMLDivElement>;
}) {
  const idx = Math.max(
    options.findIndex((o) => o.v === value),
    0,
  );
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (autoFocusGroup) btnRefs.current[idx]?.focus();
    // 僅進站聚焦一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocusGroup]);

  const move = (d: number) => {
    const n = (idx + d + options.length) % options.length;
    onChange(options[n].v);
    btnRefs.current[n]?.focus();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <div>
      <div className="mb-1.5 text-[12px] font-bold text-muted-foreground">{label}</div>
      <div ref={containerRef} role="radiogroup" aria-label={label} onKeyDown={onKey} className="flex flex-wrap gap-2">
        {options.map((o, i) => {
          const selected = value === o.v;
          const isDefault = defaultValue !== undefined && o.v === defaultValue;
          return (
            <button
              key={String(o.v)}
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(o.v)}
              className={
                (selected
                  ? 'border-primary bg-primary/15 font-bold text-primary'
                  : isDefault
                    ? 'border-primary/40 bg-primary/5 text-foreground hover:border-primary/60'
                    : 'border-border/60 text-foreground hover:border-primary/40') +
                ' relative rounded-lg border px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
              }
            >
              {o.label}
              {isDefault ? (
                <span
                  title="客戶預設"
                  className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full border border-primary/50 bg-background text-primary"
                >
                  <Star size={9} fill="currentColor" strokeWidth={0} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {hint ? <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

/** 步驟 3：交易（付款條件 + 發票種類 + 帳期 + 取貨方式） */
function TransactionStep({
  custDefaults,
  paymentTerm,
  setPaymentTerm,
  invoiceCopies,
  setInvoiceCopies,
  accountPeriod,
  setAccountPeriod,
  deliveryType,
  setDeliveryType,
  onNext,
}: {
  custDefaults: CustomerDefaults | null;
  paymentTerm: string;
  setPaymentTerm: (v: string) => void;
  invoiceCopies: number;
  setInvoiceCopies: (v: number) => void;
  accountPeriod: string;
  setAccountPeriod: (v: string) => void;
  deliveryType: string;
  setDeliveryType: (v: string) => void;
  onNext: () => void;
}) {
  // 客戶預設（標星號用）
  const defaultInvoice = custDefaults?.defaultInvoiceCopies ?? 3;
  const defaultTerm = custDefaults?.paymentTermDomestic;
  // 付款條件選項：客戶預設值若不在標準清單（如 NET45/INSTALLMENT）→ 補進去
  const termOptions =
    defaultTerm && !PAYMENT_TERMS.some((t) => t.v === defaultTerm)
      ? [{ v: defaultTerm, label: paymentTermLabel(defaultTerm) }, ...PAYMENT_TERMS]
      : PAYMENT_TERMS;
  const rolled = custDefaults?.statementDay && new Date().getDate() > custDefaults.statementDay;
  const invoiceGroupRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const deliveryGroupRef = useRef<HTMLDivElement>(null);
  const focusSelectedIn = (el: HTMLDivElement | null) =>
    el?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PillGroup
        label="付款條件"
        options={termOptions}
        value={paymentTerm}
        onChange={setPaymentTerm}
        defaultValue={defaultTerm}
        autoFocusGroup
        onEnter={() => focusSelectedIn(invoiceGroupRef.current)}
        hint="★ 為客戶主檔預設；←→ 選、Enter 到發票種類。"
      />
      <PillGroup
        label="發票種類"
        options={INVOICE_OPTS}
        value={invoiceCopies}
        onChange={setInvoiceCopies}
        defaultValue={defaultInvoice}
        containerRef={invoiceGroupRef}
        onEnter={() => monthRef.current?.focus()}
      />
      <div>
        <div className="mb-1.5 text-[12px] font-bold text-muted-foreground">帳期（帳款年月）</div>
        <input
          ref={monthRef}
          type="month"
          value={accountPeriod}
          onChange={(e) => setAccountPeriod(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              focusSelectedIn(deliveryGroupRef.current);
            }
          }}
          className="rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground"
        />
        {custDefaults?.statementDay ? (
          <div className="mt-1 text-[11px] text-muted-foreground">
            客戶結帳日 {custDefaults.statementDay} 號{rolled ? '・今天已過 → 預設切下月帳' : '・今天未過 → 本月帳'}
          </div>
        ) : (
          <div className="mt-1 text-[11px] text-muted-foreground">客戶未設結帳日 → 預設本月；可手動調整。</div>
        )}
      </div>
      <PillGroup
        label="取貨方式"
        options={DELIVERY_OPTS}
        value={deliveryType}
        onChange={setDeliveryType}
        containerRef={deliveryGroupRef}
        onEnter={onNext}
      />
      <div className="mt-auto flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          下一步：確認 →
        </button>
      </div>
    </div>
  );
}

/** 步驟 4：確認（覆核 + 自動拆單預覽 + 送出建單） */
function ConfirmStep({
  customer,
  lines,
  deliveryType,
  invoiceCopies,
  submitting,
  submitError,
  onSubmit,
}: {
  customer: PickedCustomer | null;
  lines: SalesLine[];
  deliveryType: string;
  invoiceCopies: number;
  submitting: boolean;
  submitError: string | null;
  onSubmit: () => void;
}) {
  const deliveryLabel = DELIVERY_OPTS.find((d) => d.v === deliveryType)?.label ?? deliveryType;
  const allAllocs = lines.flatMap((l) => l.allocations);
  const stockLines = allAllocs.filter((a) => a.source === 'STOCK').length;
  const transferLines = allAllocs.filter((a) => a.source === 'TRANSFER').length;
  const subtotal = lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const total = subtotal + Math.round((subtotal * taxRateOf(invoiceCopies)) / 100);
  // Alt+數字可跳步繞過 Step2 守門 → 這裡再擋一次
  const unbalanced = lines.some(
    (l) => l.allocations.some((a) => !(a.qty > 0) || !a.warehouseId) || l.allocations.reduce((s, a) => s + a.qty, 0) !== l.qty,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="rounded-xl border border-border/40 p-3 text-[13px]">
        <div>
          <span className="text-muted-foreground">客戶　</span>
          {customer ? `${customer.code}　${customer.name}` : '—'}
        </div>
        <div className="mt-1">
          <span className="text-muted-foreground">取貨　</span>
          {deliveryLabel}・含稅合計 <span className="font-bold text-primary">{money(total)}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/40">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/40 text-[11px] text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">料號 / 品名</th>
              <th className="px-2 py-1.5 text-right font-medium">數量</th>
              <th className="px-2 py-1.5 text-right font-medium">單價</th>
              <th className="px-2 py-1.5 text-left font-medium">出貨</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-border/30 align-top">
                <td className="px-2 py-1.5">
                  <div className="font-medium">{l.partNo}</div>
                  <div className="text-[11px] text-muted-foreground">{l.partName}</div>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{nf.format(l.qty)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{money(l.unitPrice)}</td>
                <td className="px-2 py-1.5 text-[11px]">
                  {l.allocations.map((a, j) => (
                    <div key={j} className={a.source === 'TRANSFER' ? 'text-amber-600' : 'text-muted-foreground'}>
                      {nf.format(a.qty)} {a.source === 'TRANSFER' ? '等調撥' : '現貨'}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-[12px]">
        <span className="font-bold text-foreground">將產生：</span>
        <span className="text-muted-foreground">
          {' '}
          銷貨單 ×1（現貨 {stockLines} 行{transferLines ? ` + 等調撥 ${transferLines} 行` : ''}）
          {transferLines ? `、調撥單 ×${transferLines}（確認時自動開、系統配來源倉）` : ''}
        </span>
      </div>

      {submitError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
          {submitError}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        {unbalanced ? <span className="text-[11px] text-destructive">有品項分配未配平（回步驟 2 調整）</span> : null}
        <button
          type="button"
          disabled={submitting || lines.length === 0 || unbalanced}
          onClick={onSubmit}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          {submitting ? '建立中…' : '建立訂單 → 送撿貨'}
        </button>
      </div>
    </div>
  );
}

/** 步驟 5：訊息（建單結果 + 客戶訊息；右側面板設定顯示項） */
function MessageStep({
  customer,
  lines,
  invoiceCopies,
  result,
  msgOpts,
  onClose,
}: {
  customer: PickedCustomer | null;
  lines: SalesLine[];
  invoiceCopies: number;
  result: OrderResult | null;
  msgOpts: MsgOpts;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  if (!result) {
    return (
      <div className="grid flex-1 place-items-center text-sm text-muted-foreground">尚未建立訂單。</div>
    );
  }
  const msg = buildMessage(customer?.name ?? '', result.docNo, lines, msgOpts, invoiceCopies);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 複製失敗忽略 */
    }
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="rounded-xl border border-primary/40 bg-primary/8 p-3">
        <div className="text-sm font-bold text-primary">✓ 訂單已建立　{result.docNo}</div>
        <div className="mt-1 text-[12px] text-muted-foreground">
          現貨 {result.stockLines} 行已送撿貨清單
          {result.transferLines ? `；等調撥 ${result.transferLines} 行已自動開調撥單、到貨後接續出貨` : ''}。
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-muted-foreground">客戶訊息</span>
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border border-border/60 px-2.5 py-1 text-[12px] hover:bg-muted/40"
        >
          {copied ? '已複製 ✓' : '複製訊息'}
        </button>
      </div>
      <textarea
        readOnly
        value={msg}
        className="min-h-0 flex-1 resize-none rounded-xl border border-border/40 bg-background/40 p-3 font-mono text-[12px] text-foreground"
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          完成・下一單
        </button>
      </div>
    </div>
  );
}

/** 右側：Step 5 客戶訊息顯示設定（存 localStorage） */
function MessageOptionsPanel({ opts, onChange }: { opts: MsgOpts; onChange: (patch: Partial<MsgOpts>) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[12px] font-bold text-muted-foreground">訊息顯示項目</div>
      <div className="flex flex-col gap-1.5">
        {MSG_OPT_DEFS.map((o) => {
          const on = opts[o.key];
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange({ [o.key]: !on })}
              className={
                (on ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-border/60 text-muted-foreground') +
                ' flex items-center justify-between rounded-lg border px-3 py-2 text-left text-[13px] hover:border-primary/40'
              }
            >
              <span>{o.label}</span>
              <span
                className={
                  (on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground') +
                  ' rounded px-1.5 py-0.5 text-[10px] font-bold'
                }
              >
                {on ? 'ON' : 'OFF'}
              </span>
            </button>
          );
        })}
      </div>
      <div className="text-[11px] text-muted-foreground">設定會記住（下次沿用）。</div>
    </div>
  );
}

/** 右側：訂單摘要（客戶 + 明細合計 + 未稅/稅額/含稅，稅隨發票種類） */
function OrderSummary({
  customer,
  lines,
  invoiceCopies,
}: {
  customer: PickedCustomer | null;
  lines: SalesLine[];
  invoiceCopies: number;
}) {
  const totalQty = lines.reduce((a, l) => a + l.qty, 0);
  const subtotal = lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const rate = taxRateOf(invoiceCopies);
  const tax = Math.round((subtotal * rate) / 100);
  const total = subtotal + tax;
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[12px] font-bold text-muted-foreground">訂單摘要</div>
      <div className="rounded-xl border border-border/40 p-3">
        <div className="text-[11px] text-muted-foreground">客戶</div>
        <div className="mt-0.5 text-sm font-medium">
          {customer ? `${customer.code}　${customer.name}` : <span className="text-muted-foreground">未選</span>}
        </div>
      </div>
      <div className="rounded-xl border border-border/40 p-3">
        <div className="flex justify-between text-[12px]">
          <span className="text-muted-foreground">品項數</span>
          <span className="font-medium tabular-nums">{lines.length}</span>
        </div>
        <div className="mt-1 flex justify-between text-[12px]">
          <span className="text-muted-foreground">總數量</span>
          <span className="font-medium tabular-nums">{nf.format(totalQty)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-border/30 pt-2 text-[13px]">
          <span className="text-muted-foreground">未稅</span>
          <span className="tabular-nums">{money(subtotal)}</span>
        </div>
        <div className="mt-1 flex justify-between text-[13px]">
          <span className="text-muted-foreground">稅額（{rate}%）</span>
          <span className="tabular-nums">{money(tax)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-border/30 pt-1.5 text-sm">
          <span className="font-bold">含稅合計</span>
          <span className="font-bold tabular-nums text-primary">{money(total)}</span>
        </div>
        {invoiceCopies === 0 ? (
          <div className="mt-1 text-[10px] text-amber-600">不開發票 → 稅額 0</div>
        ) : null}
      </div>
    </div>
  );
}
