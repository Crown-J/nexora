'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Copy,
  Download,
  Plus,
  Search,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const PAGE_KICKER = 'SALES / NX03';
const PAGE_TITLE = '銷貨與成交作業';

const WORKBENCH_ORDER = '/dashboard/nx03/workbench?phase=salesOrder';

export type WarehousePick = string;

type StatusTone = 'primary' | 'destructive' | 'success';

type FlowRow = {
  id: string;
  title: string;
  sub: string;
  date: string;
  status: string;
  tone: StatusTone;
  price?: string;
};

type StepDef = {
  id: string;
  label: string;
  pipelineTotal: number;
  cta: { label: string; href?: string };
  rows: FlowRow[];
};

const STEPS: StepDef[] = [
  {
    id: 'query',
    label: '查詢',
    pipelineTotal: 14,
    cta: { label: '' },
    rows: [
      {
        id: 'Q-LOG-01',
        title: '料號關鍵字：CAP 10uF',
        sub: '最近搜尋',
        date: '2026-03-29',
        status: '紀錄',
        tone: 'primary',
      },
    ],
  },
  {
    id: 'quote',
    label: '報價',
    pipelineTotal: 11,
    cta: { label: '' },
    rows: [
      {
        id: 'QT-2403-018',
        title: '伺服器記憶體報價',
        sub: '客戶：新旺電子股份有限公司',
        date: '2026-03-28',
        status: '待處理',
        tone: 'primary',
        price: 'NT$ 42,800',
      },
      {
        id: 'QT-2403-017',
        title: '散熱模組急件',
        sub: '客戶：台北科技有限公司',
        date: '2026-03-27',
        status: '急件',
        tone: 'destructive',
      },
    ],
  },
  {
    id: 'order',
    label: '訂單',
    pipelineTotal: 6,
    cta: { label: '+ 建立銷貨單', href: WORKBENCH_ORDER },
    rows: [
      {
        id: 'SO-2403-004',
        title: 'Q1 料件批量出貨',
        sub: '客戶：台科科技有限公司',
        date: '2026-03-25',
        status: '草稿',
        tone: 'primary',
      },
      {
        id: 'SO-2403-003',
        title: '急件：連接器補貨',
        sub: '客戶：林口電子',
        date: '2026-03-24',
        status: '已確認',
        tone: 'success',
      },
    ],
  },
  {
    id: 'prep',
    label: '備貨',
    pipelineTotal: 5,
    cta: { label: '+ 登記備貨' },
    rows: [
      {
        id: 'PK-102',
        title: 'A 倉備貨單',
        sub: '倉別：Z01 台北倉',
        date: '2026-03-29',
        status: '進行中',
        tone: 'primary',
      },
    ],
  },
  {
    id: 'ship',
    label: '出貨',
    pipelineTotal: 3,
    cta: { label: '+ 出貨登錄' },
    rows: [
      {
        id: 'DN-8891',
        title: '出貨單：主機板一批',
        sub: '物流：黑貓宅急便',
        date: '2026-03-29',
        status: '待出貨',
        tone: 'primary',
      },
    ],
  },
  {
    id: 'done',
    label: '完成',
    pipelineTotal: 9,
    cta: { label: '+ 結案登錄' },
    rows: [
      {
        id: 'CL-2201',
        title: '結案：二月訂單尾款',
        sub: '客戶：台科科技有限公司',
        date: '2026-03-20',
        status: '已完成',
        tone: 'success',
      },
      {
        id: 'CL-2198',
        title: '結案：樣品出貨',
        sub: '客戶：新旺電子股份有限公司',
        date: '2026-03-18',
        status: '已完成',
        tone: 'success',
      },
    ],
  },
];

type ToolbarAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  disabled?: boolean;
};

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { key: 'customer', label: '客戶／往來搜尋', href: '/base/partner', icon: Search },
  { key: 'api-flow', label: '客戶銷貨流程（API）', href: '/dashboard/nx03/customer-sales', icon: ClipboardList },
  { key: 'export', label: '報表匯出', icon: Download, disabled: true },
  { key: 'history', label: '歷史紀錄', icon: Clock, disabled: true },
];

const MOCK_GENERIC_PARTS = [
  { partNo: 'CAP-10UF-0603', name: '陶瓷電容 10µF 0603（通用）' },
  { partNo: 'RES-10K-0603', name: '電阻 10kΩ 0603（通用）' },
  { partNo: 'CONN-USB-C-01', name: 'USB-C 連接器（通用）' },
];

type WhRow = { code: string; name: string; qty: number };

/** 依料號：若四倉皆 0，右欄僅顯示「調貨」 */
const MOCK_STOCK_BY_PART: Record<string, WhRow[]> = {
  'CAP-10UF-0603': [
    { code: 'Z00', name: '總倉', qty: 128 },
    { code: 'Z01', name: '台北倉', qty: 42 },
    { code: 'Z02', name: '新莊倉', qty: 17 },
    { code: 'Z04', name: '林口倉', qty: 0 },
  ],
  'RES-10K-0603': [
    { code: 'Z00', name: '總倉', qty: 0 },
    { code: 'Z01', name: '台北倉', qty: 55 },
    { code: 'Z02', name: '新莊倉', qty: 12 },
    { code: 'Z04', name: '林口倉', qty: 3 },
  ],
  'CONN-USB-C-01': [
    { code: 'Z00', name: '總倉', qty: 0 },
    { code: 'Z01', name: '台北倉', qty: 0 },
    { code: 'Z02', name: '新莊倉', qty: 0 },
    { code: 'Z04', name: '林口倉', qty: 0 },
  ],
};

function stockRowsForPart(partNo: string | null): WhRow[] {
  if (!partNo) return [];
  return MOCK_STOCK_BY_PART[partNo] ?? [];
}

function allWarehousesEmpty(rows: WhRow[]): boolean {
  return rows.length > 0 && rows.every((r) => r.qty <= 0);
}

/** 出貨倉選項：有庫存之倉；若全無庫存則僅「調貨」 */
function optionsForPart(partNo: string): { code: WarehousePick; label: string; qty: number }[] {
  const rows = stockRowsForPart(partNo);
  if (rows.length === 0) return [];
  if (allWarehousesEmpty(rows)) {
    return [{ code: 'TRANSFER', label: '調貨', qty: 0 }];
  }
  return rows
    .filter((r) => r.qty > 0)
    .map((r) => ({ code: r.code, label: `${r.code} ${r.name}`, qty: r.qty }));
}

function isValidPick(partNo: string, pick: WarehousePick): boolean {
  if (pick === 'TRANSFER') return true;
  const rows = stockRowsForPart(partNo);
  const row = rows.find((r) => r.code === pick);
  return !!row && row.qty > 0;
}

function toneClasses(tone: StatusTone) {
  switch (tone) {
    case 'destructive':
      return 'border-destructive/35 bg-destructive/10 text-destructive-foreground';
    case 'success':
      return 'border-emerald-500/40 bg-emerald-500/12 text-emerald-100';
    default:
      return 'border-primary/35 bg-primary/10 text-primary';
  }
}

function pendingCount(rows: FlowRow[]) {
  return rows.filter((r) => r.status !== '已完成').length;
}

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

type AssignState = Record<string, WarehousePick>;

function WarehouseAssignDialog({
  open,
  partNos,
  assign,
  onAssignChange,
  onClose,
  onAltS,
  phase,
  errorMsg,
}: {
  open: boolean;
  partNos: string[];
  assign: AssignState;
  onAssignChange: (next: AssignState) => void;
  onClose: () => void;
  onAltS: () => void;
  phase: 'assign' | 'confirm';
  errorMsg: string | null;
}) {
  const [focusRow, setFocusRow] = useState(0);
  const [focusOpt, setFocusOpt] = useState(0);

  const partKey = partNos.join('\0');
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setFocusRow(0);
      setFocusOpt(0);
    });
    return () => {
      cancelled = true;
    };
  }, [open, partKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onAltS();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onAltS]);

  const optsForRow = (row: number) => {
    const p = partNos[row];
    return p ? optionsForPart(p) : [];
  };

  const handleAssignKeyDown = (e: React.KeyboardEvent) => {
    if (phase !== 'assign') return;
    const opts = optsForRow(focusRow);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusRow((r) => Math.min(r + 1, partNos.length - 1));
      setFocusOpt(0);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusRow((r) => Math.max(r - 1, 0));
      setFocusOpt(0);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setFocusOpt((o) => Math.min(o + 1, Math.max(0, opts.length - 1)));
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setFocusOpt((o) => Math.max(o - 1, 0));
    }
    if (e.key === 'Enter' && opts[focusOpt] && partNos[focusRow]) {
      e.preventDefault();
      const p = partNos[focusRow]!;
      const code = opts[focusOpt]!.code;
      onAssignChange({ ...assign, [p]: code });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg" draggable onKeyDown={handleAssignKeyDown} tabIndex={-1}>
        <DialogHeader>
          <DialogTitle>{phase === 'assign' ? '指定出貨倉／調貨' : '確認進入報價'}</DialogTitle>
          <DialogDescription>
            {phase === 'assign'
              ? '為每筆料號選擇倉別或調貨。Alt+S：檢查並進入確認；Enter：套用目前反白選項。'
              : 'Alt+S 或 Enter：確認後進入「報價」流程並展開建立報價單。'}
          </DialogDescription>
        </DialogHeader>
        {phase === 'assign' ? (
          <div className="space-y-3 max-h-[min(60vh,420px)] overflow-y-auto pr-1">
            {errorMsg ? (
              <p className="text-sm text-destructive" role="alert">
                {errorMsg}
              </p>
            ) : null}
            {partNos.map((p, ri) => {
              const opts = optionsForPart(p);
              const cur = assign[p] ?? opts[0]?.code;
              return (
                <div
                  key={p}
                  className={cn(
                    'rounded-lg border p-3',
                    focusRow === ri ? 'border-primary/50 bg-primary/5' : 'border-border/60',
                  )}
                >
                  <div className="font-mono text-sm font-semibold text-foreground">{p}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {opts.map((o, oi) => (
                      <button
                        key={o.code}
                        type="button"
                        onClick={() => onAssignChange({ ...assign, [p]: o.code })}
                        className={cn(
                          'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                          cur === o.code
                            ? 'border-primary bg-primary/15 text-primary'
                            : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40',
                          focusRow === ri && focusOpt === oi && 'ring-2 ring-primary/40',
                        )}
                      >
                        {o.code === 'TRANSFER' ? '調貨' : o.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {partNos.map((p) => (
              <li key={p} className="flex justify-between gap-2 border-b border-border/40 py-1.5 font-mono text-xs">
                <span>{p}</span>
                <span className="text-muted-foreground">
                  {assign[p] === 'TRANSFER' ? '調貨' : assign[p]}
                </span>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md border border-border px-4 text-sm"
            onClick={onClose}
          >
            取消
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 公司預設：新列帶入價（可改為後端設定） */
const DEFAULT_QUOTE_TIER = 'B' as const;

/** 毛利：售價 = 成本 ÷ (1 − 毛利率) */
const MARGIN_TIERS = {
  A: { label: 'A 價', margin: 0.3, hint: '三成毛利' },
  B: { label: 'B 價', margin: 0.25, hint: '兩成五毛利' },
  C: { label: 'C 價', margin: 0.15, hint: '一成五毛利' },
  D: { label: 'D 價', margin: 0.1, hint: '一成毛利' },
} as const;

/** 料號成本（mock，日後可串主檔／進價） */
const MOCK_COST_BY_PART: Record<string, number> = {
  'CAP-10UF-0603': 1800,
  'RES-10K-0603': 2.5,
  'CONN-USB-C-01': 120,
};

function tierSellPrice(cost: number, margin: number): number {
  if (cost <= 0 || margin >= 1) return 0;
  const p = cost / (1 - margin);
  return p < 100 ? Math.round(p * 100) / 100 : Math.round(p);
}

function priceHintVsB(entered: number, priceB: number): string {
  if (!(entered > 0) || !(priceB > 0)) return '';
  const pct = ((entered - priceB) / priceB) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}% 較 B 價`;
}

/** 輸入價落在哪一階參考價區間即高亮該階（A 最高、D 為地板）；低於 D 則 null */
function activeTierKey(
  entered: number,
  ref: { A: number; B: number; C: number; D: number },
): 'A' | 'B' | 'C' | 'D' | null {
  if (!(entered > 0)) return null;
  if (entered < ref.D) return null;
  if (entered >= ref.A) return 'A';
  if (entered >= ref.B) return 'B';
  if (entered >= ref.C) return 'C';
  return 'D';
}

function refPricesForCost(cost: number) {
  return {
    A: tierSellPrice(cost, MARGIN_TIERS.A.margin),
    B: tierSellPrice(cost, MARGIN_TIERS.B.margin),
    C: tierSellPrice(cost, MARGIN_TIERS.C.margin),
    D: tierSellPrice(cost, MARGIN_TIERS.D.margin),
  };
}

function formatNt(n: number): string {
  if (n < 100 && n !== Math.floor(n)) return n.toFixed(2);
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

type QuoteLineSaved = { partNo: string; name: string; price: number };

type TodayQuoteRow = {
  id: string;
  cust: string;
  status: '未成交' | '已成交';
  amt: string;
};

const QuoteCreatePanel = forwardRef<
  { save: () => void },
  {
    partNos: string[];
    open: boolean;
    onToggle: () => void;
    onSaved: (lines: QuoteLineSaved[]) => void;
  }
>(function QuoteCreatePanel({ partNos, open, onToggle, onSaved }, ref) {
  const nameByPart = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of MOCK_GENERIC_PARTS) m[p.partNo] = p.name;
    return m;
  }, []);

  const [rowFocus, setRowFocus] = useState(0);
  const [linePrices, setLinePrices] = useState<Record<string, string>>({});

  const partKey = partNos.join('\0');
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLinePrices((prev) => {
        const next: Record<string, string> = {};
        for (const pn of partNos) {
          const cost = MOCK_COST_BY_PART[pn] ?? 0;
          const defaultB = tierSellPrice(cost, MARGIN_TIERS.B.margin);
          next[pn] = prev[pn] ?? String(defaultB);
        }
        return next;
      });
      setRowFocus(0);
    });
    return () => {
      cancelled = true;
    };
  }, [partKey, partNos]);

  const focusPart = partNos[rowFocus] ?? partNos[0];
  const cost = focusPart ? MOCK_COST_BY_PART[focusPart] ?? 0 : 0;
  const refPrices = refPricesForCost(cost);

  const entered = parseFloat((focusPart && linePrices[focusPart]) ?? '') || 0;
  const glowTier = activeTierKey(entered, refPrices);

  const copyText = useMemo(() => {
    const lines = partNos.map((pn) => {
      const pr = parseFloat(linePrices[pn] ?? '') || 0;
      const nm = nameByPart[pn] ?? '';
      return `${pn} ${nm} 報價 NT$ ${formatNt(pr)}`;
    });
    return `【報價摘要】\n${lines.join('\n')}\n（請貼至通訊軟體給客戶）`;
  }, [partNos, linePrices, nameByPart]);

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = useCallback(() => {
    for (const pn of partNos) {
      const p = parseFloat(linePrices[pn] ?? '') || 0;
      if (p <= 0) continue;
      const c = MOCK_COST_BY_PART[pn] ?? 0;
      const rp = refPricesForCost(c);
      if (p < rp.D) {
        setSaveError(`${pn} 報價不可低於 D 價（地板 NT$ ${formatNt(rp.D)}）`);
        return;
      }
    }
    setSaveError(null);
    const lines: QuoteLineSaved[] = partNos.map((pn) => ({
      partNo: pn,
      name: nameByPart[pn] ?? '',
      price: parseFloat(linePrices[pn] ?? '') || 0,
    }));
    onSaved(lines);
  }, [partNos, linePrices, nameByPart, onSaved]);

  useImperativeHandle(
    ref,
    () => ({
      save: () => {
        if (partNos.length === 0) return;
        handleSave();
      },
    }),
    [partNos.length, handleSave],
  );

  const copyToClipboard = useCallback(() => {
    void navigator.clipboard.writeText(copyText);
  }, [copyText]);

  if (partNos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        請由「查詢」流程完成倉別指定後帶入零件，再在此填寫報價。
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/25 bg-card/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-foreground"
      >
        <span>
          建立報價單
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            （預設帶入{DEFAULT_QUOTE_TIER}價，可改；Alt+S 儲存報價紀錄）
          </span>
        </span>
        {open ? <ChevronUp className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
      </button>
      {open ? (
        <div className="border-t border-border/50 p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)] lg:gap-6">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">篩選零件與報價（含稅，NT$）</p>
              {saveError ? (
                <p className="text-sm text-destructive" role="alert">
                  {saveError}
                </p>
              ) : null}
              <ul className="space-y-2">
                {partNos.map((pn, i) => {
                  const nm = nameByPart[pn] ?? '';
                  const active = rowFocus === i;
                  const rowCost = MOCK_COST_BY_PART[pn] ?? 0;
                  const rowRef = refPricesForCost(rowCost);
                  const rowEntered = parseFloat(linePrices[pn] ?? '') || 0;
                  const rowHint = priceHintVsB(rowEntered, rowRef.B);
                  const belowD = rowEntered > 0 && rowEntered < rowRef.D;
                  return (
                    <li
                      key={pn}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm transition-colors',
                        active ? 'border-primary/45 bg-primary/5' : 'border-border/50 bg-background/30',
                      )}
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setRowFocus(i)}
                      >
                        <div className="font-mono text-xs text-primary">{pn}</div>
                        <div className="text-xs text-muted-foreground">{nm}</div>
                      </button>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <label className="shrink-0 text-[11px] text-muted-foreground" htmlFor={`nx03-q-${pn}`}>
                          報價
                        </label>
                        <input
                          id={`nx03-q-${pn}`}
                          type="text"
                          inputMode="decimal"
                          value={linePrices[pn] ?? ''}
                          onChange={(e) => {
                            setSaveError(null);
                            setLinePrices((prev) => ({ ...prev, [pn]: e.target.value }));
                          }}
                          onFocus={() => setRowFocus(i)}
                          className="w-[7.5rem] max-w-[32vw] shrink-0 rounded-md border border-border bg-background px-2 py-1 font-mono text-sm tabular-nums"
                        />
                        {rowHint ? (
                          <span className="text-[11px] tabular-nums text-muted-foreground">{rowHint}</span>
                        ) : null}
                        {belowD ? (
                          <span className="text-[11px] text-destructive">
                            不可低於 D 價 NT$ {formatNt(rowRef.D)}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium text-muted-foreground">參考價（依成本與毛利）</p>
              <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                {(
                  [
                    ['A', MARGIN_TIERS.A, refPrices.A],
                    ['B', MARGIN_TIERS.B, refPrices.B],
                    ['C', MARGIN_TIERS.C, refPrices.C],
                    ['D', MARGIN_TIERS.D, refPrices.D],
                  ] as const
                ).map(([key, t, val]) => {
                  const isGlow = glowTier === key;
                  return (
                    <div
                      key={key}
                      className={cn(
                        'rounded-lg border p-2 transition-[box-shadow,border-color]',
                        key === 'A' && 'bg-amber-950/35',
                        key === 'B' && 'bg-amber-900/25',
                        key === 'C' && 'bg-violet-950/35',
                        key === 'D' && 'bg-fuchsia-950/35',
                        isGlow &&
                          'border-primary ring-2 ring-primary/55 shadow-[0_0_20px_rgba(244,180,0,0.28)]',
                        !isGlow && 'border-border/40',
                      )}
                    >
                      <div className="text-muted-foreground">{t.label}</div>
                      <div className="text-[10px] text-muted-foreground/90">（{t.hint}）</div>
                      <div className="mt-1 font-semibold tabular-nums text-foreground">NT$ {formatNt(val)}</div>
                      {key === 'D' ? (
                        <div className="mt-1 text-[10px] text-amber-200/90">地板價</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">給客戶的訊息（複製）</span>
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/40"
                  >
                    <Copy className="size-3.5" aria-hidden />
                    複製
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={4}
                  value={copyText}
                  className="w-full resize-y rounded-md border border-border bg-muted/20 px-2 py-2 font-mono text-[11px] leading-relaxed text-foreground"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

QuoteCreatePanel.displayName = 'QuoteCreatePanel';

function TodayQuoteList({ rows }: { rows: TodayQuoteRow[] }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/30">
      <div className="border-b border-border/50 px-4 py-3 text-sm font-medium">今日報價單</div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">尚無今日報價紀錄</p>
      ) : (
        <ul className="divide-y divide-border/40">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{r.id}</span>
              <span className="text-foreground">{r.cust}</span>
              <span
                className={cn(
                  'rounded-md border px-2 py-0.5 text-[11px]',
                  r.status === '已成交'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-100',
                )}
              >
                {r.status}
              </span>
              <span className="tabular-nums text-primary">{r.amt}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SalesQueryPanel({
  onEnterQuoteFlow,
}: {
  onEnterQuoteFlow: (assign: AssignState, selectedPartNos: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [focusZone, setFocusZone] = useState<'search' | 'list'>('search');
  const [listFocusIndex, setListFocusIndex] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_GENERIC_PARTS;
    return MOCK_GENERIC_PARTS.filter(
      (p) => p.partNo.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
    );
  }, [query]);

  const displayPartNo = useMemo(() => {
    if (focusZone === 'list' && filtered[listFocusIndex]) return filtered[listFocusIndex]!.partNo;
    return null;
  }, [focusZone, listFocusIndex, filtered]);

  const stockRows = stockRowsForPart(displayPartNo);

  const togglePart = useCallback((partNo: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(partNo)) next.delete(partNo);
      else next.add(partNo);
      return next;
    });
  }, []);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPhase, setAssignPhase] = useState<'assign' | 'confirm'>('assign');
  const [assign, setAssign] = useState<AssignState>({});
  const [assignError, setAssignError] = useState<string | null>(null);
  const selectedList = useMemo(() => Array.from(selected), [selected]);

  const openAssignDialog = useCallback(() => {
    if (selectedList.length === 0) {
      setAssignError('請先以 Enter 選取至少一筆零件');
      return;
    }
    setAssignError(null);
    const init: AssignState = {};
    for (const p of selectedList) {
      const opts = optionsForPart(p);
      init[p] = opts[0]?.code ?? 'TRANSFER';
    }
    setAssign(init);
    setAssignPhase('assign');
    setAssignOpen(true);
  }, [selectedList]);

  const validateAssign = useCallback(
    (a: AssignState) => {
      for (const p of selectedList) {
        const pick = a[p];
        if (!pick) return `未指定倉別：${p}`;
        if (!isValidPick(p, pick)) return `倉別 ${pick} 對 ${p} 無庫存，請改選或選調貨`;
      }
      return null;
    },
    [selectedList],
  );

  const handleAssignAltS = useCallback(() => {
    if (assignPhase === 'assign') {
      const err = validateAssign(assign);
      if (err) {
        setAssignError(err);
        return;
      }
      setAssignError(null);
      setAssignPhase('confirm');
      return;
    }
    setAssignOpen(false);
    onEnterQuoteFlow(assign, selectedList);
    setAssignPhase('assign');
  }, [assign, assignPhase, validateAssign, onEnterQuoteFlow, selectedList]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key.toLowerCase() !== 's') return;
      if (assignOpen) return;
      if (isEditableTarget(e.target) && (e.target as HTMLElement).id !== 'nx03-flow-query') return;
      e.preventDefault();
      openAssignDialog();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [assignOpen, openAssignDialog]);

  useEffect(() => {
    if (assignPhase !== 'confirm' || !assignOpen) return;
    const onEnter = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return;
      e.preventDefault();
      setAssignOpen(false);
      onEnterQuoteFlow(assign, selectedList);
      setAssignPhase('assign');
    };
    window.addEventListener('keydown', onEnter);
    return () => window.removeEventListener('keydown', onEnter);
  }, [assignPhase, assignOpen, assign, onEnterQuoteFlow, selectedList]);

  const panelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (focusZone === 'search') {
        e.preventDefault();
        if (filtered.length === 0) return;
        setFocusZone('list');
        setListFocusIndex(0);
        return;
      }
      if (focusZone === 'list') {
        e.preventDefault();
        const p = filtered[listFocusIndex];
        if (p) togglePart(p.partNo);
      }
    }
    if (focusZone === 'list') {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setListFocusIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setListFocusIndex((i) => Math.max(i - 1, 0));
      }
    }
  };

  return (
    <>
      <WarehouseAssignDialog
        open={assignOpen}
        partNos={selectedList}
        assign={assign}
        onAssignChange={(next) => {
          setAssign(next);
          setAssignError(null);
        }}
        onClose={() => {
          setAssignOpen(false);
          setAssignPhase('assign');
          setAssignError(null);
        }}
        onAltS={handleAssignAltS}
        phase={assignPhase}
        errorMsg={assignError}
      />

      <div
        className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6"
        onKeyDown={panelKeyDown}
      >
        <div className="flex min-h-[280px] flex-col gap-3 rounded-xl border border-border/60 bg-background/30 p-4">
          <label className="text-sm font-medium text-foreground" htmlFor="nx03-flow-query">
            料號／品名搜尋
          </label>
          <div className="shrink-0">
            <input
              ref={searchRef}
              id="nx03-flow-query"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocusZone('search')}
              placeholder="P/N 品號搜尋"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              autoComplete="off"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Enter：進入下方清單；清單內 Enter：多選報價用零件；↑↓ 移動列。
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/50 bg-muted/10 p-2">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              適用零件（mock）
            </p>
            <ul className="space-y-1">
              {filtered.map((p, idx) => {
                const isFocus = focusZone === 'list' && listFocusIndex === idx;
                const isSel = selected.has(p.partNo);
                return (
                  <li key={p.partNo}>
                    <button
                      type="button"
                      onClick={() => {
                        setFocusZone('list');
                        setListFocusIndex(idx);
                        togglePart(p.partNo);
                      }}
                      onFocus={() => {
                        setFocusZone('list');
                        setListFocusIndex(idx);
                      }}
                      className={cn(
                        'w-full rounded-md px-2 py-2 text-left text-sm transition-colors',
                        isFocus && 'ring-2 ring-primary/35',
                        isSel ? 'bg-primary/15 ring-1 ring-primary/40' : 'hover:bg-muted/50',
                      )}
                    >
                      <span className="font-mono text-xs text-primary">{p.partNo}</span>
                      {isSel ? (
                        <span className="ml-2 text-[10px] text-primary">✓ 已選</span>
                      ) : null}
                      <span className="mt-0.5 block text-xs text-muted-foreground">{p.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="flex min-h-[280px] flex-col gap-3 rounded-xl border border-border/60 bg-background/30 p-4">
          <h3 className="text-sm font-medium text-foreground">各倉庫存</h3>
          {!displayPartNo ? (
            <span className="text-xs text-muted-foreground">請先 Enter 進入左側清單並移動反白列以檢視庫存</span>
          ) : allWarehousesEmpty(stockRows) ? (
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">各倉皆無庫存</p>
              <button
                type="button"
                className="mt-3 inline-flex items-center justify-center rounded-lg border border-primary/45 bg-primary/15 px-4 py-2 text-sm font-medium text-primary"
              >
                調貨
              </button>
            </div>
          ) : (
            <ul className="flex-1 space-y-2 overflow-auto">
              {stockRows
                .filter((w) => w.qty > 0)
                .map((w) => (
                  <li
                    key={w.code}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 bg-card/40 px-3 py-2.5"
                  >
                    <div>
                      <span className="font-mono text-sm font-semibold text-foreground">{w.code}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{w.name}</span>
                    </div>
                    <span className="tabular-nums text-sm text-foreground">{w.qty}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end border-t border-border/40 pt-4">
        <button
          type="button"
          onClick={openAssignDialog}
          disabled={selectedList.length === 0}
          className={cn(
            'inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium',
            selectedList.length > 0
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'cursor-not-allowed bg-muted text-muted-foreground',
          )}
        >
          前往報價（Alt+S）
        </button>
      </div>
    </>
  );
}

export function SalesFlowHub() {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const [createQuoteExpanded, setCreateQuoteExpanded] = useState(false);
  const [quotePartNos, setQuotePartNos] = useState<string[]>([]);
  const [todayQuotes, setTodayQuotes] = useState<TodayQuoteRow[]>([
    { id: 'QT-2403-021', cust: '台科科技', status: '未成交', amt: 'NT$ 12,400' },
    { id: 'QT-2403-020', cust: '新旺電子', status: '已成交', amt: 'NT$ 8,200' },
  ]);
  const quotePanelSaveRef = useRef<{ save: () => void } | null>(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const step = STEPS[active]!;
  const pending = useMemo(() => pendingCount(step.rows), [step.rows]);

  const handleQuoteSaved = useCallback((lines: QuoteLineSaved[]) => {
    if (lines.length === 0) return;
    const total = lines.reduce((s, l) => s + l.price, 0);
    const d = new Date();
    const id = `QT-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    setTodayQuotes((q) => [
      { id, cust: '—', status: '未成交', amt: `NT$ ${formatNt(total)}` },
      ...q,
    ]);
  }, []);

  const onEnterQuoteFlow = useCallback((assign: AssignState, selectedPartNos: string[]) => {
    void assign;
    setQuotePartNos(selectedPartNos);
    setActive(1);
    setCreateQuoteExpanded(true);
  }, []);

  useEffect(() => {
    if (pathname !== '/dashboard/nx03' || active !== 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      quotePanelSaveRef.current?.save();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pathname, active]);

  useEffect(() => {
    if (pathname !== '/dashboard/nx03') return;

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (isEditableTarget(e.target)) return;

      const k = e.key;
      if (k >= '1' && k <= '6') {
        e.preventDefault();
        const next = Number(k) - 1;
        setActive(next);
        if (next === 1) setCreateQuoteExpanded(false);
        return;
      }
      if (k.toLowerCase() === 'a') {
        if (activeRef.current !== 2) return;
        e.preventDefault();
        router.push(WORKBENCH_ORDER);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pathname, router]);

  return (
    <div className="space-y-8 text-foreground">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">{PAGE_KICKER}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{PAGE_TITLE}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          六階段流程：查詢 → 報價 → 訂單 → 備貨 → 出貨 → 完成（mock）。
          <span className="ml-1">
            <kbd className="rounded border border-border px-1 font-mono text-[11px]">Alt+1～6</kbd> 切換階段；查詢階段{' '}
            <kbd className="rounded border border-border px-1 font-mono text-[11px]">Alt+S</kbd> 前往報價（指定倉別）；報價階段{' '}
            <kbd className="rounded border border-border px-1 font-mono text-[11px]">Alt+S</kbd> 儲存報價紀錄。「訂單」階段{' '}
            <kbd className="rounded border border-border px-1 font-mono text-[11px]">Alt+A</kbd> 開啟銷貨單工作台。
          </span>
        </p>
      </header>

      <section aria-label="銷貨流程階段" className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          流程進度
        </p>
        <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-full min-w-[min(100%,720px)] items-start sm:min-w-0">
            {STEPS.map((s, i) => {
              const isActive = i === active;
              const isDone = i < active;
              return (
                <Fragment key={s.id}>
                  <div className="flex min-w-[72px] flex-1 flex-col items-center sm:min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActive(i);
                        if (i === 1) setCreateQuoteExpanded(false);
                      }}
                      className={cn(
                        'flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        isActive && 'bg-primary/10',
                        !isActive && 'hover:bg-muted/40',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
                          isDone &&
                            'border-emerald-500/45 bg-emerald-500/15 text-emerald-200',
                          isActive &&
                            !isDone &&
                            'border-primary/60 bg-primary/15 text-primary',
                          !isActive &&
                            !isDone &&
                            'border-border bg-secondary/40 text-muted-foreground',
                        )}
                      >
                        {isDone ? (
                          <Check className="h-4 w-4 text-emerald-300" aria-hidden />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span
                        className={cn(
                          'line-clamp-2 text-center text-[11px] font-medium leading-tight sm:text-xs',
                          isActive ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {s.label}
                      </span>
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {s.pipelineTotal} 筆
                      </span>
                    </button>
                  </div>
                  {i < STEPS.length - 1 ? (
                    <div
                      className={cn(
                        'mt-[22px] h-px flex-1 min-w-[6px] max-w-[32px] shrink',
                        i < active ? 'bg-primary/55' : 'bg-border',
                      )}
                      aria-hidden
                    />
                  ) : null}
                </Fragment>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className={cn(
          'rounded-2xl border border-border bg-card/60 p-4 shadow-sm sm:p-5',
          'backdrop-blur-sm',
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {step.label}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                （{pending} 筆待處理）
              </span>
            </h2>
          </div>
          {step.id === 'query' ? null : step.cta.href ? (
            <Link
              href={step.cta.href}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium',
                'border border-primary/35 bg-primary/10 text-primary',
                'transition-colors hover:border-primary/50 hover:bg-primary/18',
              )}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {step.cta.label.replace(/^\+\s*/, '')}
            </Link>
          ) : step.cta.label ? (
            <button
              type="button"
              disabled
              title="此階段尚未串接後端，僅展示流程"
              className={cn(
                'inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium',
                'border border-border bg-muted/30 text-muted-foreground',
              )}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {step.cta.label.replace(/^\+\s*/, '')}
            </button>
          ) : null}
        </div>

        {active === 0 ? (
          <SalesQueryPanel onEnterQuoteFlow={onEnterQuoteFlow} />
        ) : active === 1 ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              建立報價單僅能由「查詢」帶入零件；左側為篩選結果與報價輸入（預設 B 價），右側為 A～D 參考價與複製給客戶的摘要；下方為今日報價列表。
            </p>
            <QuoteCreatePanel
              ref={quotePanelSaveRef}
              key={quotePartNos.join('\0') || 'empty'}
              partNos={quotePartNos}
              open={createQuoteExpanded}
              onToggle={() => setCreateQuoteExpanded((v) => !v)}
              onSaved={handleQuoteSaved}
            />
            <TodayQuoteList rows={todayQuotes} />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/50 bg-background/30">
            {step.rows.map((row) => (
              <li
                key={row.id}
                className="px-4 py-3.5 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-muted/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground">
                    {row.id}
                  </span>
                  <span
                    className={cn(
                      'rounded-md border px-2 py-0.5 text-[11px] font-medium',
                      toneClasses(row.tone),
                    )}
                  >
                    {row.status}
                  </span>
                </div>
                <div className="mt-2 text-sm font-semibold text-foreground">{row.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{row.sub}</div>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                  {row.price ? (
                    <span className="text-sm font-semibold tabular-nums text-primary">{row.price}</span>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs tabular-nums text-muted-foreground">{row.date}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="border-t border-border/60 pt-5">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          常用功能
        </p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="銷貨常用功能">
          {TOOLBAR_ACTIONS.map((a) => {
            const Icon = a.icon;
            const shared = cn(
              'inline-flex items-center gap-2 text-sm transition-colors',
              a.disabled || !a.href
                ? 'cursor-not-allowed text-muted-foreground/70'
                : 'text-muted-foreground hover:text-primary',
            );
            if (a.href && !a.disabled) {
              return (
                <Link key={a.key} href={a.href} className={shared}>
                  <Icon className="h-4 w-4 shrink-0 text-primary/90" aria-hidden />
                  {a.label}
                </Link>
              );
            }
            return (
              <span key={a.key} className={shared} title="即將開放">
                <Icon className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                {a.label}
              </span>
            );
          })}
        </nav>
      </footer>
    </div>
  );
}
