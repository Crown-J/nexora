/**
 * @FUNCTION_CODE NX02-PO-UI-001-F01
 * 國內採購工作台：流程圖示軌｜需求節點（檢視）｜詢價節點表單（TASK-0420-H）
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  FileSearch,
  Package,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cx } from '@/shared/lib/cx';
import type { DemandSource, FlowNodeKey, MockDemand } from './mock-data';
import { INITIAL_NODE_BADGES, cloneInitialDemands, defaultRfqQty, turnoverMonthsLabel, turnoverMonthsTone } from './mock-data';
import { PurchaseDomesticRfqFormView } from './PurchaseDomesticRfqFormView';

/** 字級放大後略減每頁筆數，避免一屏過擠 */
const PAGE_SIZE = 5;

function PaginationBar({
  effPage,
  totalPages,
  setPage,
  ariaLabel,
  className,
}: {
  effPage: number;
  totalPages: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cx('flex min-w-0 max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-1', className)}
      role="navigation"
      aria-label={ariaLabel}
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-9 shrink-0"
        disabled={effPage <= 1}
        onClick={() => setPage(1)}
        aria-label="第一頁"
      >
        <ChevronsLeft className="size-5" aria-hidden />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-9 shrink-0"
        disabled={effPage <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        aria-label="上一頁"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </Button>
      <span className="min-w-[4rem] px-2 text-center text-sm font-medium tabular-nums text-muted-foreground">
        {effPage}/{totalPages}
      </span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-9 shrink-0"
        disabled={effPage >= totalPages}
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        aria-label="下一頁"
      >
        <ChevronRight className="size-5" aria-hidden />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-9 shrink-0"
        disabled={effPage >= totalPages}
        onClick={() => setPage(totalPages)}
        aria-label="最後一頁"
      >
        <ChevronsRight className="size-5" aria-hidden />
      </Button>
    </div>
  );
}

const FLOW: { key: FlowNodeKey; label: string; Icon: LucideIcon }[] = [
  { key: 'demand', label: '需求', Icon: ClipboardList },
  { key: 'rfq', label: '詢價', Icon: FileSearch },
  { key: 'po', label: '採購單', Icon: ShoppingCart },
  { key: 'rr', label: '進貨單', Icon: Package },
  { key: 'pr', label: '退貨單', Icon: RotateCcw },
  { key: 'warranty', label: '保固申請', Icon: ShieldCheck },
];

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

function nextDrNo(demands: MockDemand[]): string {
  let max = 0;
  for (const d of demands) {
    const m = d.no.match(/^DR-\d{6}-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1]!, 10));
  }
  return `DR-202604-${String(max + 1).padStart(3, '0')}`;
}

type DemandFilter = 'all' | 'system' | 'sales' | 'urgent_priority';

function gapToSafety(d: MockDemand): number {
  return Math.max(0, d.safetyStock - d.currentStock);
}

/** 庫存比例條：0～maxStock；橘線＝安全量；填色依現存與安全量 */
function StockVisual({ d, className }: { d: MockDemand; className?: string }) {
  const max = Math.max(d.maxStock, d.safetyStock, d.currentStock, 1);
  const fillPct = Math.min(100, (d.currentStock / max) * 100);
  const safetyPct = Math.min(100, (d.safetyStock / max) * 100);
  const zero = d.currentStock === 0;
  const below = d.currentStock < d.safetyStock;
  const barColor = zero ? 'bg-red-500' : below ? 'bg-orange-500' : 'bg-emerald-500';
  const gap = gapToSafety(d);

  return (
    <div className={cx('min-w-0 w-full max-w-full', className)}>
      <div className="relative mx-auto h-3 w-full max-w-full rounded-full bg-muted/70 xl:mx-0 xl:max-w-[12.5rem]">
        <div className={cx('h-full rounded-l-full transition-[width]', barColor)} style={{ width: `${fillPct}%` }} />
        <div
          className="pointer-events-none absolute top-[-3px] z-[1] h-[calc(100%+6px)] w-0.5 bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.55)]"
          style={{ left: `clamp(0px, ${safetyPct}%, calc(100% - 2px))` }}
          title="安全量位置"
        />
      </div>
      <div className="mt-1.5 min-w-0 space-y-1 text-xs tabular-nums text-muted-foreground">
        <div className="font-mono leading-snug">
          {d.currentStock} / {d.safetyStock} / {d.maxStock}
        </div>
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5 leading-snug">
          <span className="font-semibold text-orange-600 dark:text-orange-400">
            缺口 {gap}
            {d.unit ? ` ${d.unit}` : ''}
          </span>
          <span className="text-muted-foreground">·</span>
          <span
            className={cx(
              'font-semibold',
              turnoverMonthsTone(d.turnoverMonths) === 'green' && 'text-emerald-600 dark:text-emerald-400',
              turnoverMonthsTone(d.turnoverMonths) === 'orange' && 'text-orange-600 dark:text-orange-400',
              turnoverMonthsTone(d.turnoverMonths) === 'red' && 'text-red-600 dark:text-red-400',
            )}
          >
            {turnoverMonthsLabel(d.turnoverMonths)}
          </span>
        </div>
      </div>
    </div>
  );
}

function FlowNavIconRail({
  activeNode,
  setActiveNode,
  badgeFor,
}: {
  activeNode: FlowNodeKey;
  setActiveNode: (k: FlowNodeKey) => void;
  badgeFor: (k: FlowNodeKey) => number;
}) {
  const activeNodeIndex = FLOW.findIndex((n) => n.key === activeNode);

  return (
    <nav
      className="flex h-full min-h-0 w-[3.25rem] shrink-0 flex-col border-r border-border/50 bg-muted/20 py-3 sm:w-14"
      aria-label="採購流程節點"
    >
      <ul className="flex flex-1 flex-col items-stretch justify-between gap-0.5 py-1">
        {FLOW.map((node, i) => {
          const selected = activeNode === node.key;
          const badge = badgeFor(node.key);
          const completed = activeNodeIndex >= 0 && i < activeNodeIndex;
          const showBadge = badge > 0;
          const Icon = node.Icon;

          return (
            <li key={node.key} className="flex flex-1 flex-col items-center justify-center">
              {i > 0 ? <div className="mb-0.5 h-2 w-px shrink-0 bg-border" aria-hidden /> : null}
              <button
                type="button"
                title={node.label}
                aria-label={node.label}
                aria-current={selected ? 'step' : undefined}
                onClick={() => setActiveNode(node.key)}
                className={cx(
                  'relative flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors',
                  selected
                    ? 'border-amber-500/60 bg-amber-500/15 text-amber-700 shadow-sm dark:text-amber-300'
                    : completed
                      ? 'border-emerald-500/35 text-emerald-700/90 hover:bg-muted/50 dark:text-emerald-400/90'
                      : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <Icon className="size-[1.35rem] shrink-0 stroke-[1.75]" aria-hidden />
                {showBadge ? (
                  <span className="absolute -right-0.5 -top-0.5 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-orange-500 px-0.5 text-[10px] font-bold leading-none text-white tabular-nums">
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
                <span className="sr-only">
                  {node.label}
                  {showBadge ? `，${badge} 筆` : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function PurchaseDomesticWorkbenchView() {
  const [activeNode, setActiveNode] = useState<FlowNodeKey>('demand');
  const [demands, setDemands] = useState<MockDemand[]>(() => cloneInitialDemands());
  const [demandFilter, setDemandFilter] = useState<DemandFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [addDemandOpen, setAddDemandOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);

  const [newPartCode, setNewPartCode] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [newQty, setNewQty] = useState('10');
  const [newSource, setNewSource] = useState<DemandSource>('sales');
  const [newUrgent, setNewUrgent] = useState(false);
  const [newPartBrand, setNewPartBrand] = useState('');
  const [newRemark, setNewRemark] = useState('');

  const filteredDemands = useMemo(() => {
    let list = [...demands];
    if (demandFilter === 'system') list = list.filter((d) => d.source === 'system');
    else if (demandFilter === 'sales') list = list.filter((d) => d.source === 'sales');
    else if (demandFilter === 'urgent_priority') {
      list.sort((a, b) => {
        const as = a.source === 'sales' ? 0 : 1;
        const bs = b.source === 'sales' ? 0 : 1;
        if (as !== bs) return as - bs;
        const au = a.isUrgent ? 0 : 1;
        const bu = b.isUrgent ? 0 : 1;
        if (au !== bu) return au - bu;
        return b.date.localeCompare(a.date);
      });
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.partCode.toLowerCase().includes(q) ||
          d.partName.toLowerCase().includes(q) ||
          d.partBrand.toLowerCase().includes(q),
      );
    }
    return list;
  }, [demands, demandFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredDemands.length / PAGE_SIZE));
  const effPage = Math.min(Math.max(1, page), totalPages);
  const pagedDemands = useMemo(() => {
    const start = (effPage - 1) * PAGE_SIZE;
    return filteredDemands.slice(start, start + PAGE_SIZE);
  }, [filteredDemands, effPage]);

  useEffect(() => {
    setPage(1);
  }, [demandFilter, search]);

  useEffect(() => {
    setFocusIdx((i) => Math.min(Math.max(0, i), Math.max(0, pagedDemands.length - 1)));
  }, [pagedDemands.length]);

  const saveNewDemand = useCallback(() => {
    const name = newPartName.trim();
    const code = newPartCode.trim() || `PART-${Date.now()}`;
    if (!name) return;
    const qty = Math.max(1, parseInt(newQty, 10) || 1);
    const safety = 10;
    const maxStock = Math.max(safety + 20, qty * 2);
    const row: MockDemand = {
      no: nextDrNo(demands),
      date: '2026-04-20',
      partCode: code,
      partName: name,
      partBrand: newPartBrand.trim() || '—',
      qty,
      unit: '個',
      source: newSource,
      isUrgent: newUrgent,
      currentStock: 0,
      safetyStock: safety,
      maxStock,
      turnoverMonths: 2.5,
      suggestedVendor: null,
      salesName: newSource === 'sales' ? '（手動）' : null,
      customerName: null,
      remark: newRemark.trim() || null,
    };
    setDemands((prev) => [row, ...prev]);
    setAddDemandOpen(false);
    setNewPartCode('');
    setNewPartName('');
    setNewQty('10');
    setNewSource('sales');
    setNewUrgent(false);
    setNewPartBrand('');
    setNewRemark('');
  }, [demands, newPartName, newPartCode, newPartBrand, newQty, newSource, newUrgent, newRemark]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (addDemandOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setAddDemandOpen(false);
        }
        return;
      }
      if (isEditableTarget(e.target)) {
        if (e.altKey) e.preventDefault();
        return;
      }
      if (e.altKey) {
        const k = e.key;
        if (k === '1' || k === '2' || k === '3' || k === '4' || k === '5' || k === '6') {
          e.preventDefault();
          setActiveNode(FLOW[parseInt(k, 10) - 1]!.key);
          return;
        }
        if (k.toLowerCase() === 'a') {
          e.preventDefault();
          setAddDemandOpen(true);
          return;
        }
      }
      if (activeNode !== 'demand') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (pagedDemands.length === 0) return;
        setFocusIdx((i) => Math.min(pagedDemands.length - 1, i + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (pagedDemands.length === 0) return;
        setFocusIdx((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addDemandOpen, activeNode, pagedDemands, focusIdx]);

  const badgeFor = (key: FlowNodeKey) => (key === 'demand' ? demands.length : INITIAL_NODE_BADGES[key]);

  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-2 overflow-x-hidden">
      <header className="shrink-0 px-1">
        <p className="text-xs tracking-[0.3em] text-muted-foreground">NX02-PO-UI-001-F01</p>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">國內採購工作台</h1>
      </header>

      <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-row overflow-x-hidden overflow-y-hidden rounded-xl border border-border/60 bg-card/30">
        <FlowNavIconRail activeNode={activeNode} setActiveNode={setActiveNode} badgeFor={badgeFor} />

        <section
          className={cx(
            'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background/40 p-2 sm:p-3',
            activeNode === 'demand' && 'border-r border-border/50',
          )}
        >
          {activeNode === 'demand' ? (
            <DemandMiddleColumn
              filteredTotal={filteredDemands.length}
              pagedDemands={pagedDemands}
              effPage={effPage}
              totalPages={totalPages}
              setPage={setPage}
              demandFilter={demandFilter}
              setDemandFilter={setDemandFilter}
              search={search}
              setSearch={setSearch}
              focusIdx={focusIdx}
              setFocusIdx={setFocusIdx}
            />
          ) : activeNode === 'rfq' ? (
            <PurchaseDomesticRfqFormView demands={demands} />
          ) : activeNode === 'po' ? (
            <PlaceholderMiddle title="採購單" subtitle="PO 採購單列表（規格後續補充）" />
          ) : activeNode === 'rr' ? (
            <PlaceholderMiddle title="進貨單" subtitle="RR 進貨單列表（規格後續補充）" />
          ) : activeNode === 'pr' ? (
            <PlaceholderMiddle title="退貨單" subtitle="PR 退貨單列表（規格後續補充）" />
          ) : (
            <PlaceholderMiddle title="保固申請" subtitle="保固申請列表（規格後續補充）" />
          )}
        </section>

        {activeNode === 'demand' ? (
          <aside className="flex h-full min-h-0 min-w-0 w-[min(100%,28rem)] max-w-[min(28rem,100%)] shrink flex-col overflow-hidden bg-muted/15 p-2.5 sm:max-w-[min(28rem,42vw)] sm:p-3 lg:max-w-[min(28rem,38vw)]">
            <DemandGoToRfqAside totalPending={demands.length} onGoRfq={() => setActiveNode('rfq')} />
          </aside>
        ) : activeNode !== 'rfq' ? (
          <aside className="flex h-full min-h-0 min-w-0 w-[min(100%,28rem)] max-w-[min(28rem,100%)] shrink flex-col overflow-hidden bg-muted/15 p-2.5 sm:max-w-[min(28rem,42vw)] sm:p-3 lg:max-w-[min(28rem,38vw)]">
            {activeNode === 'po' ? (
              <PlaceholderRight title="採購單審核" subtitle="明細與審核操作（占位）" />
            ) : activeNode === 'rr' ? (
              <PlaceholderRight title="驗收" subtitle="逐筆核對（占位）" />
            ) : activeNode === 'pr' ? (
              <PlaceholderRight title="退貨處置" subtitle="（占位）" />
            ) : (
              <PlaceholderRight title="廠商接洽" subtitle="（占位）" />
            )}
          </aside>
        ) : null}
      </div>

      <Dialog open={addDemandOpen} onOpenChange={setAddDemandOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>手動新增需求單</DialogTitle>
            <DialogDescription>建立一筆 DEMO 採購需求（寫入本頁 mock 清單）。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="nd-code">料號</Label>
              <Input
                id="nd-code"
                value={newPartCode}
                onChange={(e) => setNewPartCode(e.target.value)}
                placeholder="選填，未填則自動產生"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nd-name">品名</Label>
              <Input
                id="nd-name"
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
                placeholder="必填"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nd-qty">需求量</Label>
              <Input
                id="nd-qty"
                type="number"
                min={1}
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>來源</Label>
              <select
                className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value as DemandSource)}
              >
                <option value="system">系統自動</option>
                <option value="sales">業務提交</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border border-input accent-amber-600"
                checked={newUrgent}
                onChange={(e) => setNewUrgent(e.target.checked)}
              />
              緊急
            </label>
            <div className="grid gap-1.5">
              <Label htmlFor="nd-brand">廠牌（選填）</Label>
              <Input
                id="nd-brand"
                value={newPartBrand}
                onChange={(e) => setNewPartBrand(e.target.value)}
                placeholder="例：BOSCH"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nd-rm">備註</Label>
              <Textarea id="nd-rm" rows={2} value={newRemark} onChange={(e) => setNewRemark(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setAddDemandOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={saveNewDemand}>
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlaceholderMiddle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 p-6 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function PlaceholderRight({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-lg border border-dashed border-border/50 p-4 text-sm">
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

const FILTER_CHIPS: { key: DemandFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'system', label: '系統自動' },
  { key: 'sales', label: '業務提交' },
  { key: 'urgent_priority', label: '緊急優先' },
];

function DemandGoToRfqAside({ totalPending, onGoRfq }: { totalPending: number; onGoRfq: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          共 <span className="tabular-nums font-medium text-foreground">{totalPending}</span> 筆待處理
        </p>
        <Button
          type="button"
          variant="secondary"
          className="h-9 shrink-0 border-amber-500/40 bg-amber-500/15 text-amber-950 hover:bg-amber-500/25 dark:text-amber-50"
          onClick={onGoRfq}
        >
          前往詢價節點 →
        </Button>
      </div>
      <div className="min-h-0 flex-1 rounded-lg border border-dashed border-border/50 bg-card/30 p-3 text-sm leading-relaxed text-muted-foreground">
        <p className="text-foreground">此節點為需求檢視</p>
        <p className="mt-2">請於詢價節點建立詢價單與明細。快捷鍵：<span className="font-mono text-xs">Alt+2</span> 切換至詢價。</p>
      </div>
    </div>
  );
}

function DemandMiddleColumn({
  filteredTotal,
  pagedDemands,
  effPage,
  totalPages,
  setPage,
  demandFilter,
  setDemandFilter,
  search,
  setSearch,
  focusIdx,
  setFocusIdx,
}: {
  filteredTotal: number;
  pagedDemands: MockDemand[];
  effPage: number;
  totalPages: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  demandFilter: DemandFilter;
  setDemandFilter: (f: DemandFilter) => void;
  search: string;
  setSearch: (s: string) => void;
  focusIdx: number;
  setFocusIdx: (i: number | ((n: number) => number)) => void;
}) {
  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-2 overflow-x-hidden overflow-y-hidden">
      <div className="flex shrink-0 flex-wrap items-end gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold text-foreground">採購需求</h2>
        <p className="text-sm text-muted-foreground">
          {filteredTotal > 0 ? (
            <>
              篩選 <span className="tabular-nums text-foreground">{filteredTotal}</span> 筆
            </>
          ) : (
            '無符合篩選之資料'
          )}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">篩選：</span>
          {FILTER_CHIPS.map((c) => (
            <Button
              key={c.key}
              type="button"
              size="sm"
              variant={demandFilter === c.key ? 'secondary' : 'outline'}
              className="h-9 px-3 text-sm"
              onClick={() => setDemandFilter(c.key)}
            >
              {c.label}
            </Button>
          ))}
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋料號、品名或廠牌"
          autoComplete="off"
          className="h-9 w-full shrink-0 text-sm sm:w-[min(100%,15rem)] md:w-[17rem]"
          aria-label="搜尋料號、品名或廠牌"
        />
      </div>

      <PaginationBar
        effPage={effPage}
        totalPages={totalPages}
        setPage={setPage}
        ariaLabel="採購需求分頁"
        className="shrink-0 justify-end border-b border-border/40 pb-2"
      />

      <div
        role="listbox"
        aria-label="採購需求單列表"
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5"
      >
        {pagedDemands.map((d, idx) => {
          const focused = idx === focusIdx;
          const urgent = d.isUrgent;

          const onCardActivate = () => {
            setFocusIdx(idx);
          };

          const suggestedQty = defaultRfqQty(d);

          return (
            <div
              key={d.no}
              role="option"
              aria-selected={focused}
              onClick={onCardActivate}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  onCardActivate();
                }
              }}
              tabIndex={-1}
              className={cx(
                'flex min-w-0 max-w-full cursor-pointer flex-col gap-3 overflow-hidden rounded-lg border border-border/60 bg-card/50 px-2.5 py-2.5 text-left transition-colors hover:bg-muted/30 xl:flex-row xl:items-stretch xl:justify-between xl:gap-4 xl:px-3',
                focused && 'ring-1 ring-amber-500/40',
                urgent && 'border-l-[3px] border-l-red-500',
              )}
              onMouseEnter={() => setFocusIdx(idx)}
            >
              <div className="flex min-w-0 w-full max-w-full xl:w-auto xl:max-w-[min(100%,22rem)]">
                {/* 前：料號、品名、廠牌（不 flex-grow，避免與中部之間空洞） */}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="break-all font-mono text-xs font-medium leading-tight text-muted-foreground">{d.partCode}</p>
                  <p className="break-words text-base font-semibold leading-snug text-foreground">{d.partName}</p>
                  <p className="text-sm text-muted-foreground">
                    廠牌 <span className="font-medium text-foreground">{d.partBrand}</span>
                  </p>
                  {d.remark ? (
                    <p className="line-clamp-2 text-xs italic leading-relaxed text-muted-foreground">{d.remark}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex min-w-0 w-full flex-1 flex-col gap-3 xl:w-auto xl:flex-row xl:flex-nowrap xl:items-stretch xl:justify-end xl:gap-4">
                {/* 中：庫存數字 + 跑條 */}
                <div className="flex w-full min-w-0 flex-col justify-center gap-2 border-y border-border/40 py-2 xl:w-[min(100%,15.5rem)] xl:shrink-0 xl:border-x xl:border-y-0 xl:px-3 xl:py-0">
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { label: '目前庫存', value: d.currentStock },
                        { label: '安全量', value: d.safetyStock },
                        { label: '最高量', value: d.maxStock },
                      ] as const
                    ).map((cell) => (
                      <div key={cell.label} className="text-center xl:text-left">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{cell.label}</p>
                        <p className="mt-0.5 text-lg font-bold tabular-nums leading-none text-foreground">{cell.value}</p>
                      </div>
                    ))}
                  </div>
                  <StockVisual d={d} className="pt-0.5" />
                </div>

                {/* 後：需求來源、建議數量 */}
                <div className="flex w-full min-w-0 flex-col justify-center gap-2 xl:w-[min(100%,10.5rem)] xl:shrink-0 xl:text-right">
                  <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
                    {d.source === 'system' ? (
                      <span className="rounded-md bg-sky-600/20 px-2 py-1 text-xs font-semibold text-sky-950 dark:text-sky-50">
                        系統自動
                      </span>
                    ) : (
                      <>
                        <span className="rounded-md bg-orange-500/20 px-2 py-1 text-xs font-semibold text-orange-950 dark:text-orange-50">
                          業務提交
                        </span>
                        {d.isUrgent ? (
                          <span className="rounded-md bg-red-600/22 px-2 py-1 text-xs font-semibold text-red-950 dark:text-red-50">
                            緊急
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                  {d.source === 'sales' ? (
                    <p className="break-words text-xs leading-snug text-muted-foreground xl:text-right">
                      {d.salesName}｜{d.customerName ?? '—'}
                    </p>
                  ) : null}
                  <div>
                    <p className="text-xs text-muted-foreground xl:text-right">建議數量</p>
                    <p className="text-2xl font-bold tabular-nums leading-none tracking-tight text-foreground xl:text-right">
                      {suggestedQty}
                      {d.unit ? <span className="ml-1 text-sm font-normal text-muted-foreground">{d.unit}</span> : null}
                    </p>
                    {suggestedQty !== d.qty ? (
                      <p className="mt-0.5 text-[11px] text-muted-foreground xl:text-right">需求單量 {d.qty}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
