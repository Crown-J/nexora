// apps/nx-ui/src/features/nx04/sales-return/ui/InstantSalesReturnWorkspace.tsx
// F2 即時工作檯・站 5「即時銷退」——業務發起退貨快速開單精靈
//
// 拍板（執行長 2026-07-19）：
//   · 站 5＝即時銷退（原「即時補貨」挪站 6）
//   · 只收業務發起（initiationType='A'）；送貨員當場帶回（B）走既有桌面銷退流程
//   · 送出後直接轉「檢驗中」（DRAFT→INSPECTING）、倉庫馬上看得到準備收貨
// 範式對齊站 4（InstantSalesWorkspace）：5 步 客戶→退貨明細→退貨資訊→確認→訊息、
//   FocusLockedDialog、Alt+1~5 跳步、關窗/切站守衛、步驟 4/5 掛載聚焦主動作鈕（Enter 關窗教訓）。
// 後端：GET /nx04/so/returnable-lines（挑原單行、含已退量）→ POST /nx04/sales-return（DRAFT、
//   倉別/客戶自動帶原單）→ PATCH status=INSPECTING；一張銷退綁一張原銷貨單、跨單走「完成・下一單」。
'use client';

import { ClipboardCheck, MessageSquareText, ReceiptText, Undo2, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { listReturnableSoLines } from '@data/endpoints/nx04/so/api/so';
import { createSr, updateSr } from '@data/endpoints/nx04/sales-return/api/sales-return';
import type { ReturnableSo, ReturnableSoLine } from '@data/types/nx04/so';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

import { CustomerPicker, type PickedCustomer } from '@/features/nx04/quote/ui/CustomerPicker';
import { PillGroup } from '@/features/nx04/sales/ui/InstantSalesWorkspace';
import { registerStationDirtyChecker } from '@/features/shared/instant-workbench/station-registry';

type SrStage = 1 | 2 | 3 | 4 | 5;

const STAGE_DEFS: { n: SrStage; label: string; icon: ReactNode; hint: string }[] = [
  { n: 1, label: '客戶', icon: <UserRound size={18} />, hint: '選擇客戶' },
  { n: 2, label: '退貨明細', icon: <Undo2 size={18} />, hint: '挑原銷貨單・勾行退量與原因' },
  { n: 3, label: '退貨資訊', icon: <ReceiptText size={18} />, hint: '取件方式・備註' },
  { n: 4, label: '確認', icon: <ClipboardCheck size={18} />, hint: '覆核・送出轉檢驗' },
  { n: 5, label: '訊息', icon: <MessageSquareText size={18} />, hint: '結果・客戶訊息' },
];

/** 退貨原因（schema returnReason 值域） */
const RETURN_REASONS: { v: string; label: string }[] = [
  { v: 'C', label: '客戶不需要' },
  { v: 'D', label: '商品有瑕疵' },
  { v: 'W', label: '送錯料號' },
  { v: 'Q', label: '送錯數量' },
  { v: 'O', label: '其他' },
];
const reasonLabel = (v: string) => RETURN_REASONS.find((r) => r.v === v)?.label ?? v;

/** 取件方式（schema returnMethod 值域；預設外務取回＝恆迎常態） */
const RETURN_METHODS: { v: string; label: string }[] = [
  { v: 'C', label: '外務取回' },
  { v: 'S', label: '客戶自送回' },
  { v: 'P', label: '客戶寄回' },
];
const methodLabel = (v: string) => RETURN_METHODS.find((m) => m.v === v)?.label ?? v;
const METHOD_MSG: Record<string, string> = {
  C: '外務將安排取回',
  S: '再麻煩將商品送回門市/倉庫',
  P: '再麻煩打包寄回（寄送方式另洽）',
};

/** 退貨政策標籤（part.returnPolicy 快照；N 不可退 → 走通融、必填原因） */
const POLICY_LABEL: Record<string, string> = { F: '自由退', S: '標準', R: '限制', N: '不可退', W: '保固' };

const nf = new Intl.NumberFormat('zh-TW');
const money = (n: number) => `$${nf.format(Math.round(n))}`;
const soStatusLabel = (s: string) => (s === 'SHIPPED' ? '已出貨' : s === 'INVOICED' ? '已開票' : s);

/** 已勾的退貨行草稿 */
type RetLine = {
  soItemId: string;
  lineNo: number;
  partNo: string;
  partName: string;
  unitPrice: number;
  /** 可退上限（原量－已退） */
  maxQty: number;
  qty: number;
  returnReason: string;
  returnPolicy: string;
  /** returnPolicy=N 走業務通融（returnType=E）、必填 */
  concessionReason: string;
};

type SrResult = { docNo: string; totalAmount: number; inspectOk: boolean };

/** 依退貨行組客戶訊息 */
function buildSrMessage(customerName: string, docNo: string, lines: RetLine[], total: number, method: string): string {
  const rows = lines.map((l) => `・${l.partNo} ${l.partName} ×${nf.format(l.qty)}（${reasonLabel(l.returnReason)}）`);
  return [`【${customerName}】退貨單 ${docNo}`, ...rows, `退款合計（含稅）${money(total)}`, METHOD_MSG[method] ?? ''].join('\n');
}

/** 對外：受控元件，殼以 open/onClosed 掛載（比照站 4 切走即關） */
export function InstantSalesReturnWorkspace({ open, onClosed }: { open: boolean; onClosed: () => void }) {
  if (!open) return null;
  return <InstantSrDialog onClose={onClosed} />;
}

function InstantSrDialog({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<SrStage>(1);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [sos, setSos] = useState<ReturnableSo[]>([]);
  const [sosLoading, setSosLoading] = useState(false);
  const [selectedSoId, setSelectedSoId] = useState<string | null>(null);
  const [retLines, setRetLines] = useState<RetLine[]>([]);
  const [returnMethod, setReturnMethod] = useState('C');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SrResult | null>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);

  const selectedSo = sos.find((s) => s.soId === selectedSoId) ?? null;
  const taxRate = selectedSo ? Number(selectedSo.taxRate) : 5;
  const subtotal = retLines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const taxAmount = Math.round((subtotal * taxRate) / 100);
  const total = subtotal + taxAmount;

  // 選客戶 → 抓可退貨原單清單；換不同客戶 → 原單/退貨行歸零
  const pickedIdRef = useRef<string | null>(null);
  const handlePickCustomer = useCallback((c: PickedCustomer) => {
    if (pickedIdRef.current !== null && pickedIdRef.current !== c.id) {
      setSelectedSoId(null);
      setRetLines([]);
    }
    pickedIdRef.current = c.id;
    setCustomer(c);
    setSosLoading(true);
    listReturnableSoLines(c.id)
      .then((rows) => setSos(rows))
      .catch(() => setSos([]))
      .finally(() => setSosLoading(false));
  }, []);

  // 換原單（一張銷退綁一張原單）：已勾行 → 先確認再清
  const selectSo = useCallback(
    (soId: string) => {
      if (soId === selectedSoId) return;
      if (retLines.length > 0 && !window.confirm('換原單會清掉已勾的退貨行——確定切換？')) return;
      setSelectedSoId(soId);
      setRetLines([]);
    },
    [selectedSoId, retLines.length],
  );

  const upsertLine = useCallback((line: RetLine) => {
    setRetLines((prev) => {
      const idx = prev.findIndex((l) => l.soItemId === line.soItemId);
      if (idx === -1) return [...prev, line];
      const next = [...prev];
      next[idx] = line;
      return next;
    });
  }, []);
  const removeLine = useCallback((soItemId: string) => {
    setRetLines((prev) => prev.filter((l) => l.soItemId !== soItemId));
  }, []);

  // 送出：建銷退（DRAFT、單一 POST 原子）→ 轉檢驗中（失敗不擋、單已在草稿、標示給業務）
  const submit = useCallback(async () => {
    if (!selectedSo || retLines.length === 0 || submitting || result) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const sr = await createSr({
        soId: selectedSo.soId,
        srDate: new Date().toISOString().slice(0, 10),
        returnMethod,
        initiationType: 'A',
        taxRate,
        remark: remark.trim() || undefined,
        items: retLines.map((l) => ({
          soItemId: l.soItemId,
          qty: l.qty,
          returnReason: l.returnReason,
          ...(l.returnPolicy === 'N' ? { returnType: 'E', concessionReason: l.concessionReason } : {}),
        })),
      });
      let inspectOk = true;
      try {
        await updateSr(sr.id, { status: 'INSPECTING' });
      } catch {
        inspectOk = false;
      }
      setResult({ docNo: sr.docNo, totalAmount: Number(sr.totalAmount), inspectOk });
      setStage(5);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '建立銷退單失敗');
    } finally {
      setSubmitting(false);
    }
  }, [selectedSo, retLines, submitting, result, returnMethod, taxRate, remark]);

  // Alt+1~5 跳步（比照站 4）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 5) {
        e.preventDefault();
        e.stopPropagation();
        setStage(n as SrStage);
      }
    };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, []);

  // 關窗/切站守衛（站有資料未送出 → 確認；送出完成放行）
  const dirtyRef = useRef(false);
  dirtyRef.current = !result && (customer !== null || retLines.length > 0);
  useEffect(() => registerStationDirtyChecker(5, () => dirtyRef.current), []);
  const guardedClose = useCallback(() => {
    if (dirtyRef.current && !window.confirm('退貨單還沒送出、關閉會清空已填內容——確定關閉？')) return;
    onClose();
  }, [onClose]);

  const cur = STAGE_DEFS.find((s) => s.n === stage)!;

  return (
    <FocusLockedDialog
      open
      onClose={guardedClose}
      ariaLabel="即時銷退"
      initialFocusRef={customerInputRef}
      backdropClassName="bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-150"
      dialogClassName="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in-95 duration-150"
      dialogStyle={{ width: 'min(1080px, 96vw)', height: 'min(680px, 92vh)' }}
    >
      {/* header */}
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2.5">
        <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_#02EDAB]" />
        <h2 className="text-sm font-bold tracking-wide">即時銷退</h2>
        <span className="text-[11px] text-muted-foreground">・業務發起退貨開單</span>
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
          onClick={guardedClose}
          aria-label="關閉"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      {/* body：52px 流程軌 | 主區 | 副區 */}
      <div className="grid min-h-0 flex-1 grid-cols-[52px_minmax(360px,1.15fr)_minmax(300px,1fr)]">
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

        <section className="flex min-h-0 flex-col overflow-hidden p-5">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-base font-bold">
              {cur.n}. {cur.label}
            </span>
            <span className="text-[12px] text-muted-foreground">{cur.hint}</span>
          </div>

          {stage === 1 ? (
            <CustomerStep customer={customer} inputRef={customerInputRef} onPick={handlePickCustomer} onNext={() => setStage(2)} />
          ) : stage === 2 ? (
            <ReturnLinesStep
              customer={customer}
              sos={sos}
              loading={sosLoading}
              selectedSo={selectedSo}
              onSelectSo={selectSo}
              retLines={retLines}
              upsertLine={upsertLine}
              removeLine={removeLine}
              onNext={() => setStage(3)}
            />
          ) : stage === 3 ? (
            <ReturnInfoStep
              returnMethod={returnMethod}
              setReturnMethod={setReturnMethod}
              remark={remark}
              setRemark={setRemark}
              selectedSo={selectedSo}
              onNext={() => setStage(4)}
            />
          ) : stage === 4 ? (
            <ConfirmStep
              selectedSo={selectedSo}
              retLines={retLines}
              returnMethod={returnMethod}
              subtotal={subtotal}
              taxAmount={taxAmount}
              total={total}
              submitting={submitting}
              submitError={submitError}
              onSubmit={() => void submit()}
            />
          ) : (
            <MessageStep customer={customer} retLines={retLines} result={result} returnMethod={returnMethod} onClose={onClose} />
          )}
        </section>

        {/* 副區：退貨摘要 */}
        <aside className="flex min-h-0 flex-col overflow-auto border-l border-border/40 p-5">
          <div className="mb-3 text-[12px] font-bold text-muted-foreground">退貨摘要</div>
          <div className="rounded-xl border border-border/40 p-3 text-[13px]">
            <div>
              <span className="text-muted-foreground">客戶　</span>
              {customer ? `${customer.code}　${customer.name}` : <span className="text-muted-foreground">未選</span>}
            </div>
            <div className="mt-1">
              <span className="text-muted-foreground">原單　</span>
              {selectedSo ? selectedSo.docNo : <span className="text-muted-foreground">未選</span>}
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-border/40 p-3 text-[13px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">退貨行數</span>
              <span className="tabular-nums">{retLines.length}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">退款小計</span>
              <span className="tabular-nums">{money(subtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">稅額（{taxRate}%）</span>
              <span className="tabular-nums">{money(taxAmount)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-border/40 pt-1 font-bold">
              <span>退款合計</span>
              <span className="tabular-nums text-primary">{money(total)}</span>
            </div>
          </div>
          {retLines.length ? (
            <div className="mt-3 flex flex-col gap-1 text-[12px]">
              {retLines.map((l) => (
                <div key={l.soItemId} className="flex justify-between gap-2">
                  <span className="truncate">{l.partNo}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    ×{nf.format(l.qty)}・{reasonLabel(l.returnReason)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      </div>

      <div className="border-t border-border/40 px-4 py-2 text-[11px] text-muted-foreground">
        Alt+1~5 跳步・Enter 下一步・Esc 關閉
      </div>
    </FocusLockedDialog>
  );
}

/** 步驟 1：客戶（比照站 4） */
function CustomerStep({
  customer,
  inputRef,
  onPick,
  onNext,
}: {
  customer: PickedCustomer | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (c: PickedCustomer) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <CustomerPicker onPick={onPick} onCommit={onNext} inputRef={inputRef} />
      {customer ? (
        <div className="rounded-xl border border-primary/40 bg-primary/8 p-3 text-sm">
          已選客戶　<span className="font-bold">{customer.code}　{customer.name}</span>
          <div className="mt-1 text-[12px] text-muted-foreground">Enter 下一步：挑原銷貨單勾退貨行。</div>
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
          下一步：退貨明細 →
        </button>
      </div>
    </div>
  );
}

/** 行內編輯草稿 */
type EditDraft = {
  line: ReturnableSoLine;
  qty: string;
  reason: string;
  concession: string;
};

/** 步驟 2：挑原單＋勾行（↑↓ 移列、Enter 開行編輯：退量→原因→（不可退）通融原因） */
function ReturnLinesStep({
  customer,
  sos,
  loading,
  selectedSo,
  onSelectSo,
  retLines,
  upsertLine,
  removeLine,
  onNext,
}: {
  customer: PickedCustomer | null;
  sos: ReturnableSo[];
  loading: boolean;
  selectedSo: ReturnableSo | null;
  onSelectSo: (soId: string) => void;
  retLines: RetLine[];
  upsertLine: (l: RetLine) => void;
  removeLine: (soItemId: string) => void;
  onNext: () => void;
}) {
  const [edit, setEdit] = useState<EditDraft | null>(null);
  const [editErr, setEditErr] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const reasonGroupRef = useRef<HTMLDivElement>(null);
  const concessionRef = useRef<HTMLInputElement>(null);

  // 掛載聚焦清單首列（同步驟 4 教訓：焦點不留 body）
  useEffect(() => {
    queueMicrotask(() => listRef.current?.querySelector<HTMLElement>('button[data-row]')?.focus());
  }, [selectedSo?.soId]);
  // 開行編輯 → 聚焦退量
  useEffect(() => {
    if (edit) queueMicrotask(() => qtyRef.current?.focus());
  }, [edit?.line.soItemId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ↑↓ 在列間移動焦點（列＝button[data-row]）；行編輯器內（輸入框/原因膠囊）不搶
  const moveRow = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    if ((e.target as HTMLElement).closest('[data-sr-editor]')) return;
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>('button[data-row]') ?? []);
    if (!rows.length) return;
    e.preventDefault();
    const idx = rows.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'ArrowDown' ? Math.min(rows.length - 1, idx + 1) : Math.max(0, idx - 1);
    rows[next >= 0 ? next : 0]?.focus();
  };

  const openEditor = (line: ReturnableSoLine) => {
    const exist = retLines.find((l) => l.soItemId === line.soItemId);
    const max = Number(line.returnableQty);
    setEditErr(null);
    setEdit({
      line,
      qty: String(exist?.qty ?? max),
      reason: exist?.returnReason ?? 'C',
      concession: exist?.concessionReason ?? '',
    });
  };

  const commitEditor = () => {
    if (!edit) return;
    const max = Number(edit.line.returnableQty);
    const q = Number(edit.qty);
    if (!(q > 0) || q > max) {
      setEditErr(`退量需介於 1 ~ ${nf.format(max)}（可退量）`);
      qtyRef.current?.focus();
      return;
    }
    if (edit.line.returnPolicy === 'N' && !edit.concession.trim()) {
      setEditErr('不可退品項走業務通融、通融原因必填');
      concessionRef.current?.focus();
      return;
    }
    upsertLine({
      soItemId: edit.line.soItemId,
      lineNo: edit.line.lineNo,
      partNo: edit.line.partNo,
      partName: edit.line.partName,
      unitPrice: Number(edit.line.unitPrice),
      maxQty: max,
      qty: q,
      returnReason: edit.reason,
      returnPolicy: edit.line.returnPolicy,
      concessionReason: edit.concession.trim(),
    });
    setEdit(null);
  };

  if (!customer) {
    return <div className="grid flex-1 place-items-center text-sm text-muted-foreground">先回步驟 1 選客戶（Alt+1）。</div>;
  }
  if (loading) {
    return <div className="grid flex-1 place-items-center text-sm text-muted-foreground">載入可退貨原單…</div>;
  }

  // 未選原單：列可退貨 SO
  if (!selectedSo) {
    const withReturnable = sos.filter((s) => s.items.some((i) => Number(i.returnableQty) > 0));
    if (!withReturnable.length) {
      return (
        <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
          此客戶近 20 張已出貨/已開票銷貨單都沒有可退量。
        </div>
      );
    }
    return (
      <div ref={listRef} onKeyDown={moveRow} className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto">
        <div className="mb-1 text-[12px] text-muted-foreground">↑↓ 選原銷貨單、Enter 進入勾行（近 20 張、僅列有可退量的單）。</div>
        {withReturnable.map((s) => (
          <button
            key={s.soId}
            type="button"
            data-row
            onClick={() => onSelectSo(s.soId)}
            className="flex items-center gap-3 rounded-xl border border-border/50 px-3 py-2.5 text-left text-sm hover:border-primary/40 focus:border-primary/60 focus:bg-primary/8 focus:outline-none"
          >
            <span className="font-mono text-[13px]">{s.docNo}</span>
            <span className="text-[12px] text-muted-foreground">{String(s.soDate).slice(0, 10)}</span>
            <span className="rounded bg-muted/60 px-1.5 text-[10px] text-muted-foreground">{soStatusLabel(s.status)}</span>
            <span className="ml-auto text-[12px] text-muted-foreground">
              可退 {s.items.filter((i) => Number(i.returnableQty) > 0).length} 行
            </span>
            <span className="tabular-nums text-[13px]">{money(Number(s.totalAmount))}</span>
          </button>
        ))}
      </div>
    );
  }

  // 已選原單：勾行
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-2 text-[12px]">
        <span className="text-muted-foreground">原單</span>
        <span className="font-mono font-bold">{selectedSo.docNo}</span>
        <span className="text-muted-foreground">{String(selectedSo.soDate).slice(0, 10)}</span>
        <button
          type="button"
          onClick={() => onSelectSo('')}
          className="ml-auto rounded-lg border border-border/60 px-2 py-0.5 text-[12px] hover:bg-muted/40"
        >
          ← 換原單
        </button>
      </div>
      <div ref={listRef} onKeyDown={moveRow} className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/40">
        {selectedSo.items.map((i) => {
          const max = Number(i.returnableQty);
          const picked = retLines.find((l) => l.soItemId === i.soItemId);
          const disabled = max <= 0;
          return (
            <div key={i.soItemId} className="border-b border-border/30 last:border-b-0">
              <button
                type="button"
                data-row={disabled ? undefined : ''}
                disabled={disabled}
                onClick={() => openEditor(i)}
                onKeyDown={(e) => {
                  if ((e.key === 'Delete' || e.key === 'Backspace') && picked) {
                    e.preventDefault();
                    removeLine(i.soItemId);
                  }
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm focus:bg-primary/8 focus:outline-none ${disabled ? 'opacity-45' : 'hover:bg-muted/30'}`}
              >
                <span className="w-32 shrink-0 font-mono text-[13px]">{i.partNo}</span>
                <span className="min-w-0 flex-1 truncate text-[13px]">{i.partName}</span>
                {i.returnPolicy !== 'F' && i.returnPolicy !== 'S' ? (
                  <span
                    className={`shrink-0 rounded px-1.5 text-[10px] ${i.returnPolicy === 'N' ? 'bg-destructive/15 text-destructive' : 'bg-amber-500/15 text-amber-600'}`}
                  >
                    {POLICY_LABEL[i.returnPolicy] ?? i.returnPolicy}
                  </span>
                ) : null}
                <span className="shrink-0 tabular-nums text-[12px] text-muted-foreground">
                  出{nf.format(Number(i.qty))}
                  {Number(i.returnedQty) > 0 ? `・已退${nf.format(Number(i.returnedQty))}` : ''}・可退{nf.format(max)}
                </span>
                <span className="w-20 shrink-0 text-right tabular-nums text-[13px]">{money(Number(i.unitPrice))}</span>
                {picked ? (
                  <span className="shrink-0 rounded bg-primary/15 px-1.5 text-[11px] font-bold text-primary">
                    退{nf.format(picked.qty)}
                  </span>
                ) : null}
              </button>
              {edit?.line.soItemId === i.soItemId ? (
                <div data-sr-editor className="flex flex-wrap items-center gap-3 border-t border-dashed border-border/40 bg-muted/20 px-3 py-2">
                  <label className="flex items-center gap-1.5 text-[12px]">
                    退量
                    <input
                      ref={qtyRef}
                      value={edit.qty}
                      onChange={(e) => setEdit({ ...edit, qty: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          reasonGroupRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          setEdit(null);
                        }
                      }}
                      inputMode="numeric"
                      className="w-16 rounded border border-border/60 bg-background px-2 py-1 text-right text-sm"
                    />
                    <span className="text-muted-foreground">/ {nf.format(Number(edit.line.returnableQty))}</span>
                  </label>
                  <div
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        setEdit(null);
                      }
                    }}
                  >
                    <PillGroup
                      label=""
                      options={RETURN_REASONS}
                      value={edit.reason}
                      onChange={(v) => setEdit({ ...edit, reason: v })}
                      containerRef={reasonGroupRef}
                      onEnter={() => {
                        if (edit.line.returnPolicy === 'N') concessionRef.current?.focus();
                        else commitEditor();
                      }}
                    />
                  </div>
                  {edit.line.returnPolicy === 'N' ? (
                    <label className="flex min-w-[220px] flex-1 items-center gap-1.5 text-[12px]">
                      通融原因
                      <input
                        ref={concessionRef}
                        value={edit.concession}
                        onChange={(e) => setEdit({ ...edit, concession: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitEditor();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            e.stopPropagation();
                            setEdit(null);
                          }
                        }}
                        maxLength={200}
                        placeholder="不可退品項、寫清楚為何通融"
                        className="flex-1 rounded border border-border/60 bg-background px-2 py-1 text-sm"
                      />
                    </label>
                  ) : null}
                  <button
                    type="button"
                    onClick={commitEditor}
                    className="rounded-lg bg-primary px-3 py-1 text-[12px] font-bold text-primary-foreground"
                  >
                    確定
                  </button>
                  {retLines.some((l) => l.soItemId === i.soItemId) ? (
                    <button
                      type="button"
                      onClick={() => {
                        removeLine(i.soItemId);
                        setEdit(null);
                      }}
                      className="rounded-lg border border-destructive/50 px-2.5 py-1 text-[12px] text-destructive hover:bg-destructive/10"
                    >
                      移除
                    </button>
                  ) : null}
                  {editErr ? <span className="text-[11px] text-destructive">{editErr}</span> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-3">
        <span className="text-[11px] text-muted-foreground">
          Enter 勾行/改行・Delete 移除・已勾 {retLines.length} 行
        </span>
        <button
          type="button"
          disabled={retLines.length === 0}
          onClick={onNext}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          下一步：退貨資訊 →
        </button>
      </div>
    </div>
  );
}

/** 步驟 3：退貨資訊（取件方式＋備註；退回倉＝原單出貨倉、後端自帶） */
function ReturnInfoStep({
  returnMethod,
  setReturnMethod,
  remark,
  setRemark,
  selectedSo,
  onNext,
}: {
  returnMethod: string;
  setReturnMethod: (v: string) => void;
  remark: string;
  setRemark: (v: string) => void;
  selectedSo: ReturnableSo | null;
  onNext: () => void;
}) {
  const remarkRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-1 flex-col gap-6">
      <PillGroup
        label="取件方式"
        options={RETURN_METHODS}
        value={returnMethod}
        onChange={setReturnMethod}
        autoFocusGroup
        onEnter={() => remarkRef.current?.focus()}
        hint="←→ 選、Enter 到備註。"
      />
      <div>
        <div className="mb-1.5 text-[12px] font-bold text-muted-foreground">備註（選填）</div>
        <input
          ref={remarkRef}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onNext();
            }
          }}
          maxLength={200}
          placeholder="例：客戶說包裝未拆、下週三前取"
          className="w-full rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground"
        />
      </div>
      <div className="text-[12px] text-muted-foreground">
        退回倉庫＝原單出貨倉（系統自帶）；退貨日期＝今天。
        {selectedSo ? `原單 ${selectedSo.docNo}、稅率 ${Number(selectedSo.taxRate)}%。` : ''}
      </div>
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

/** 步驟 4：確認（覆核＋送出轉檢驗；掛載聚焦送出鈕——焦點掉 body 教訓） */
function ConfirmStep({
  selectedSo,
  retLines,
  returnMethod,
  subtotal,
  taxAmount,
  total,
  submitting,
  submitError,
  onSubmit,
}: {
  selectedSo: ReturnableSo | null;
  retLines: RetLine[];
  returnMethod: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  submitting: boolean;
  submitError: string | null;
  onSubmit: () => void;
}) {
  const submitRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const btn = submitRef.current;
    if (btn && !btn.disabled) btn.focus();
    else rootRef.current?.focus();
  }, []);

  return (
    <div ref={rootRef} tabIndex={-1} className="flex min-h-0 flex-1 flex-col gap-3 outline-none">
      <div className="rounded-xl border border-border/40 p-3 text-[13px]">
        <div>
          <span className="text-muted-foreground">原單　</span>
          {selectedSo ? `${selectedSo.docNo}（${soStatusLabel(selectedSo.status)}）` : '—'}
        </div>
        <div className="mt-1">
          <span className="text-muted-foreground">取件　</span>
          {methodLabel(returnMethod)}・退款合計 <span className="font-bold text-primary">{money(total)}</span>
          <span className="text-muted-foreground">（小計 {money(subtotal)}＋稅 {money(taxAmount)}）</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/40">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/40 text-[11px] text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">料號 / 品名</th>
              <th className="px-2 py-1.5 text-right font-medium">退量</th>
              <th className="px-2 py-1.5 text-right font-medium">單價</th>
              <th className="px-2 py-1.5 text-left font-medium">原因</th>
            </tr>
          </thead>
          <tbody>
            {retLines.map((l) => (
              <tr key={l.soItemId} className="border-t border-border/30 align-top">
                <td className="px-2 py-1.5">
                  <div className="font-medium">{l.partNo}</div>
                  <div className="text-[11px] text-muted-foreground">{l.partName}</div>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{nf.format(l.qty)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{money(l.unitPrice)}</td>
                <td className="px-2 py-1.5 text-[12px]">
                  {reasonLabel(l.returnReason)}
                  {l.returnPolicy === 'N' ? (
                    <div className="text-[11px] text-destructive">通融：{l.concessionReason}</div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-[12px]">
        <span className="font-bold text-foreground">將產生：</span>
        <span className="text-muted-foreground">
          銷退單 ×1（{retLines.length} 行）、送出即轉「檢驗中」——倉庫收貨判好壞品後過帳退款/折讓。
        </span>
      </div>
      {submitError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
          {submitError}
        </div>
      ) : null}
      <div className="flex items-center justify-end gap-3">
        <button
          ref={submitRef}
          type="button"
          disabled={submitting || retLines.length === 0 || !selectedSo}
          onClick={onSubmit}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          {submitting ? '送出中…' : '建立退貨單 → 送檢驗'}
        </button>
      </div>
    </div>
  );
}

/** 步驟 5：訊息（結果＋客戶訊息；掛載聚焦完成鈕） */
function MessageStep({
  customer,
  retLines,
  result,
  returnMethod,
  onClose,
}: {
  customer: PickedCustomer | null;
  retLines: RetLine[];
  result: SrResult | null;
  returnMethod: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const doneRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    doneRef.current?.focus();
  }, []);
  if (!result) {
    return <div className="grid flex-1 place-items-center text-sm text-muted-foreground">尚未送出退貨單。</div>;
  }
  const msg = buildSrMessage(customer?.name ?? '', result.docNo, retLines, result.totalAmount, returnMethod);
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
        <div className="text-sm font-bold text-primary">✓ 退貨單已建立　{result.docNo}</div>
        <div className="mt-1 text-[12px] text-muted-foreground">
          {result.inspectOk
            ? `已轉「檢驗中」、倉庫收貨判好壞品後過帳；取件方式：${methodLabel(returnMethod)}。`
            : '⚠️ 單已建立但轉檢驗失敗、目前停在草稿——請到銷退單列表手動送檢驗。'}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-muted-foreground">客戶訊息</span>
        <button
          type="button"
          onClick={() => void copy()}
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
          ref={doneRef}
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
