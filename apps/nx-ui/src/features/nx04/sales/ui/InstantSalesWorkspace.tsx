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

import { ListPlus, MessageSquareText, ReceiptText, Trash2, Truck, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { getQuotePriceIntel } from '@data/endpoints/nx04/quote/api/quote';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

import { CustomerPicker, type PickedCustomer } from '@/features/nx04/quote/ui/CustomerPicker';
import { PartPicker, type PickedPart } from '@/features/nx04/quote/ui/PartPicker';

/** 站內步驟號（5 步；與 SO 建單流程對應） */
type SalesStage = 1 | 2 | 3 | 4 | 5;

type StageDef = { n: SalesStage; label: string; icon: ReactNode; hint: string };

const STAGE_DEFS: StageDef[] = [
  { n: 1, label: '客戶', icon: <UserRound size={18} />, hint: '選擇客戶' },
  { n: 2, label: '明細', icon: <ListPlus size={18} />, hint: '品項・數量・價格' },
  { n: 3, label: '交易', icon: <ReceiptText size={18} />, hint: '付款方式・發票種類' },
  { n: 4, label: '出貨', icon: <Truck size={18} />, hint: '出貨倉庫・取貨方式' },
  { n: 5, label: '訊息', icon: <MessageSquareText size={18} />, hint: '確認・訊息內容' },
];

/** 建單草稿的明細行（step 4 才補 warehouseId） */
export type SalesLine = {
  partId: string;
  partNo: string;
  partName: string;
  brandName: string | null;
  availableTotal: string;
  qty: number;
  unitPrice: number;
  remark: string;
  /** 選料時本客戶是否已有近一月報價紀錄；false → 建單送出時自動生成即時報價紀錄（commit 5） */
  hadQuoteRecord: boolean;
};

const nf = new Intl.NumberFormat('zh-TW');
const money = (n: number) => `$${nf.format(Math.round(n))}`;

/** 對外：受控元件，殼以 open/onClosed 掛載（比照 GlobalTransferInquiry） */
export function InstantSalesWorkspace({ open, onClosed }: { open: boolean; onClosed: () => void }) {
  if (!open) return null;
  return <InstantSalesDialog onClose={onClosed} />;
}

function InstantSalesDialog({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<SalesStage>(1);
  // ── 建單草稿 ──
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [lines, setLines] = useState<SalesLine[]>([]);

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
            <CustomerStep customer={customer} onPick={setCustomer} onNext={() => setStage(2)} />
          ) : stage === 2 ? (
            <ItemsStep customer={customer} lines={lines} setLines={setLines} onNext={() => setStage(3)} />
          ) : (
            <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-border/50 text-sm text-muted-foreground">
              步驟 {cur.n}「{cur.label}」建置中
            </div>
          )}
        </section>

        {/* 副區：訂單摘要（步驟 5 訊息設定於後續 commit 疊在此） */}
        <aside className="flex min-h-0 flex-col overflow-auto border-l border-border/40 p-5">
          <OrderSummary customer={customer} lines={lines} />
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
  onPick,
  onNext,
}: {
  customer: PickedCustomer | null;
  onPick: (c: PickedCustomer) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <CustomerPicker onPick={onPick} onCommit={() => customer && onNext()} autoFocus partnerType="C" />
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

/** 步驟 2：明細（加品項 → 數量/單價/備註 → 加入清單；單價自動帶報價） */
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
  // 選料時本客戶是否已有近一月報價紀錄（false → 建單時自動生成即時報價紀錄）
  const [hadRecord, setHadRecord] = useState(false);
  const [pickerKey, setPickerKey] = useState(0); // 加入後重置 PartPicker
  const [confirmOpen, setConfirmOpen] = useState(false);
  const qtyRef = useRef<HTMLInputElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const linesRef = useRef(lines);
  linesRef.current = lines;

  // Alt+S 存檔 → 跳確認視窗（明細輸入完、確認後進「交易」步驟）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      e.stopPropagation();
      if (linesRef.current.length > 0) setConfirmOpen(true);
    };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, []);

  // 選料 → 自動帶價（近一月本客戶報價/成交較近者、否則建議售價；沿用即時報價範式）
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
      setPriceSource(
        recent ? (recent === cq ? '近一月報價' : '近一月成交') : intel.suggestedPrice ? '建議售價' : null,
      );
      setHadRecord(!!cq); // 有近一月報價紀錄 → 建單時不再重複生成
    } catch {
      /* 查不到不擋、留白手填 */
    } finally {
      setPriceLoading(false);
    }
  };

  const addLine = () => {
    if (!pending) return;
    const q = Number(qty);
    const pr = Number(price);
    if (!(q > 0) || !(pr >= 0) || price.trim() === '') return;
    setLines((prev) => [
      ...prev,
      {
        partId: pending.id,
        partNo: pending.code,
        partName: pending.name,
        brandName: pending.brandName,
        availableTotal: pending.availableTotal,
        qty: q,
        unitPrice: pr,
        remark: remark.trim(),
        hadQuoteRecord: hadRecord,
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
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLine())}
                  placeholder="選填"
                  className="w-full rounded border border-border/60 bg-background px-2 py-1 text-sm text-foreground"
                />
              </label>
              <button
                type="button"
                onClick={addLine}
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
            搜尋料號加入，選定後自動帶價、填數量/備註，Enter 一路到加入。
          </div>
        )}
      </div>

      {/* 明細清單 */}
      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/40">
        {lines.length === 0 ? (
          <div className="grid h-full place-items-center text-[12px] text-muted-foreground">尚無品項</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/40 text-[11px] text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">料號 / 品名</th>
                <th className="px-2 py-1.5 text-right font-medium">數量</th>
                <th className="px-2 py-1.5 text-right font-medium">單價</th>
                <th className="px-2 py-1.5 text-right font-medium">小計</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-t border-border/30">
                  <td className="px-2 py-1.5">
                    <div className="font-medium">{l.partNo}</div>
                    <div className="text-[11px] text-muted-foreground">{l.partName}</div>
                    {l.remark ? <div className="text-[11px] text-amber-600">※ {l.remark}</div> : null}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{nf.format(l.qty)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{money(l.unitPrice)}</td>
                  <td className="px-2 py-1.5 text-right font-medium tabular-nums">{money(l.qty * l.unitPrice)}</td>
                  <td className="px-1 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                      aria-label="移除"
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between">
        {!customer ? (
          <span className="text-[11px] text-amber-600">尚未選客戶（步驟 1），無法自動帶價</span>
        ) : (
          <span className="text-[11px] text-muted-foreground">Alt+S 存檔並進下一步</span>
        )}
        <button
          type="button"
          disabled={lines.length === 0}
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

/** 右側：訂單摘要（客戶 + 明細合計） */
function OrderSummary({ customer, lines }: { customer: PickedCustomer | null; lines: SalesLine[] }) {
  const totalQty = lines.reduce((a, l) => a + l.qty, 0);
  const totalAmt = lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
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
        <div className="mt-2 flex justify-between border-t border-border/30 pt-2 text-sm">
          <span className="font-bold">金額（未稅）</span>
          <span className="font-bold tabular-nums text-primary">{money(totalAmt)}</span>
        </div>
      </div>
    </div>
  );
}
