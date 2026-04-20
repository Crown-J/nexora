/**
 * @FUNCTION_CODE NX02-PO-UI-001-F01
 * 國內採購工作台：三欄（160px 流程節點｜需求緊湊卡片｜300px 待詢價）
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
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
import type { DemandSource, FlowNodeKey, MockDemand, NodeBadges } from './mock-data';
import {
  INITIAL_NODE_BADGES,
  buildRfqSplitPreview,
  cloneInitialDemands,
  defaultRfqQty,
} from './mock-data';

const PAGE_SIZE = 6;

const FLOW: { key: FlowNodeKey; label: string }[] = [
  { key: 'demand', label: '需求' },
  { key: 'rfq', label: '詢價' },
  { key: 'po', label: '採購單' },
  { key: 'rr', label: '進貨單' },
  { key: 'pr', label: '退貨單' },
  { key: 'warranty', label: '保固申請' },
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

type QueueEntry = { no: string; qty: number };

function gapToSafety(d: MockDemand): number {
  return Math.max(0, d.safetyStock - d.currentStock);
}

/** 庫存條：比例尺 0～maxStock；橘線＝安全量位置；填色依現存與安全量比較 */
function StockVisual({ d }: { d: MockDemand }) {
  const max = Math.max(d.maxStock, d.safetyStock, d.currentStock, 1);
  const fillPct = Math.min(100, (d.currentStock / max) * 100);
  const safetyPct = Math.min(100, (d.safetyStock / max) * 100);
  const zero = d.currentStock === 0;
  const below = d.currentStock < d.safetyStock;
  const barColor = zero ? 'bg-red-500' : below ? 'bg-orange-500' : 'bg-emerald-500';
  const gap = gapToSafety(d);

  return (
    <div className="w-[180px] shrink-0">
      <div className="relative h-2 w-[120px] max-w-full rounded-full bg-muted/70">
        <div className={cx('h-full rounded-l-full transition-[width]', barColor)} style={{ width: `${fillPct}%` }} />
        <div
          className="pointer-events-none absolute top-[-2px] z-[1] h-[calc(100%+4px)] w-px bg-amber-600 shadow-sm"
          style={{ left: `clamp(0px, ${safetyPct}%, calc(100% - 1px))` }}
          title="安全量位置"
        />
      </div>
      <div className="mt-1 whitespace-nowrap font-mono text-[10px] leading-tight tabular-nums text-muted-foreground">
        {d.currentStock} / {d.safetyStock} / {d.maxStock}
      </div>
      <div className="text-[10px] font-medium text-orange-600 dark:text-orange-400">
        缺口{gap}
        {d.unit ? ` ${d.unit}` : ''}
      </div>
    </div>
  );
}

function FlowNav160({
  activeNode,
  setActiveNode,
  badgeFor,
  activeNodeIndex,
}: {
  activeNode: FlowNodeKey;
  setActiveNode: (k: FlowNodeKey) => void;
  badgeFor: (k: FlowNodeKey) => number;
  activeNodeIndex: number;
}) {
  return (
    <nav
      className="flex w-[160px] shrink-0 flex-col border-r border-border/50 bg-muted/20 py-3 pl-3 pr-2"
      aria-label="採購流程節點"
    >
      <ul className="relative flex flex-col">
        {FLOW.map((node, i) => {
          const selected = activeNode === node.key;
          const badge = badgeFor(node.key);
          const completed = i < activeNodeIndex;
          const below = i > activeNodeIndex;
          const hollowGray = below && badge === 0;
          const hollowGreen = completed;
          const showBadge = badge > 0;

          return (
            <li key={node.key} className="relative flex min-h-[44px] flex-col">
              {i > 0 ? (
                <div className="absolute top-0 left-[7px] h-2 w-px -translate-y-full bg-border" aria-hidden />
              ) : null}
              <button
                type="button"
                onClick={() => setActiveNode(node.key)}
                className={cx(
                  'relative z-[1] flex w-full items-start gap-2 rounded-md py-1.5 pr-1 text-left text-xs transition-colors',
                  selected ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground hover:bg-muted/50',
                )}
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
                  {selected ? (
                    <span className="inline-block size-3 rounded-full bg-amber-500 shadow-sm ring-2 ring-amber-500/30" />
                  ) : hollowGreen ? (
                    <span className="inline-block size-3 rounded-full border-2 border-emerald-500 bg-transparent" />
                  ) : hollowGray ? (
                    <span className="inline-block size-3 rounded-full border border-muted-foreground/40 bg-transparent" />
                  ) : (
                    <span className="inline-block size-3 rounded-full border border-muted-foreground/50 bg-transparent" />
                  )}
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  <span className={cx('font-medium', selected && 'text-amber-600 dark:text-amber-400')}>
                    {node.label}
                  </span>
                  {showBadge ? (
                    <span className="ml-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-orange-500/90 px-1 text-[10px] font-semibold text-white tabular-nums">
                      {badge}
                    </span>
                  ) : null}
                </span>
              </button>
              {i < FLOW.length - 1 ? (
                <div
                  className="absolute top-[calc(1.125rem+6px)] left-[7px] bottom-0 w-px bg-border"
                  aria-hidden
                />
              ) : null}
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
  const [nodeBadges, setNodeBadges] = useState<NodeBadges>(() => ({ ...INITIAL_NODE_BADGES }));
  const [demandFilter, setDemandFilter] = useState<DemandFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [addDemandOpen, setAddDemandOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const [dragNo, setDragNo] = useState<string | null>(null);

  const [newPartCode, setNewPartCode] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [newQty, setNewQty] = useState('10');
  const [newSource, setNewSource] = useState<DemandSource>('sales');
  const [newUrgent, setNewUrgent] = useState(false);
  const [newVendor, setNewVendor] = useState('');
  const [newRemark, setNewRemark] = useState('');

  const demandMap = useMemo(() => new Map(demands.map((d) => [d.no, d])), [demands]);

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
        (d) => d.partCode.toLowerCase().includes(q) || d.partName.toLowerCase().includes(q),
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

  const queueOrdered = useMemo(
    () => queueEntries.map((e) => demandMap.get(e.no)).filter(Boolean) as MockDemand[],
    [queueEntries, demandMap],
  );

  const splitPreview = useMemo(() => buildRfqSplitPreview(queueOrdered), [queueOrdered]);
  const hasUnspecifiedVendor = splitPreview.some((l) => l.unspecified);
  const activeNodeIndex = FLOW.findIndex((n) => n.key === activeNode);

  const toggleInQueue = useCallback((no: string, checked: boolean) => {
    setQueueEntries((prev) => {
      if (!checked) return prev.filter((e) => e.no !== no);
      if (prev.some((e) => e.no === no)) return prev;
      const d = demandMap.get(no);
      if (!d) return prev;
      return [...prev, { no, qty: defaultRfqQty(d) }];
    });
  }, [demandMap]);

  const setEntryQty = useCallback((no: string, qty: number) => {
    const q = Math.max(1, Math.floor(qty) || 1);
    setQueueEntries((prev) => prev.map((e) => (e.no === no ? { ...e, qty: q } : e)));
  }, []);

  const removeFromQueue = useCallback((no: string) => {
    setQueueEntries((prev) => prev.filter((e) => e.no !== no));
  }, []);

  const onDragStartRow = (no: string) => () => setDragNo(no);
  const onDragOverAllow = (e: React.DragEvent) => e.preventDefault();
  const onDropRow = (no: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragNo;
    setDragNo(null);
    if (!from || from === no) return;
    setQueueEntries((prev) => {
      const i = prev.findIndex((x) => x.no === from);
      const j = prev.findIndex((x) => x.no === no);
      if (i < 0 || j < 0) return prev;
      const next = [...prev];
      const tmp = next[i]!;
      next[i] = next[j]!;
      next[j] = tmp;
      return next;
    });
  };
  const onDragEnd = () => setDragNo(null);

  const vendorSummary = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of queueEntries) {
      const d = demandMap.get(e.no);
      if (!d) continue;
      const v = d.suggestedVendor ?? '（未指定廠商）';
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()];
  }, [queueEntries, demandMap]);

  const openCreateRfq = useCallback(() => {
    if (activeNode !== 'demand' || queueEntries.length === 0) return;
    setConfirmOpen(true);
  }, [activeNode, queueEntries.length]);

  const confirmCreateRfq = useCallback(() => {
    const nos = new Set(queueEntries.map((e) => e.no));
    const nRf = splitPreview.length;
    setDemands((prev) => prev.filter((d) => !nos.has(d.no)));
    setQueueEntries([]);
    setConfirmOpen(false);
    setNodeBadges((b) => ({ ...b, rfq: b.rfq + nRf }));
    setActiveNode('rfq');
  }, [queueEntries, splitPreview.length]);

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
      qty,
      unit: '個',
      source: newSource,
      isUrgent: newUrgent,
      currentStock: 0,
      safetyStock: safety,
      maxStock,
      suggestedVendor: newVendor.trim() || null,
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
    setNewVendor('');
    setNewRemark('');
  }, [demands, newPartName, newPartCode, newQty, newSource, newUrgent, newVendor, newRemark]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (confirmOpen || addDemandOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setConfirmOpen(false);
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
        if (k.toLowerCase() === 's' && activeNode === 'demand') {
          e.preventDefault();
          openCreateRfq();
          return;
        }
        if (k.toLowerCase() === 'a') {
          e.preventDefault();
          setAddDemandOpen(true);
          return;
        }
      }
      if (activeNode !== 'demand') return;
      if (e.key === ' ' && pagedDemands.length > 0) {
        e.preventDefault();
        const row = pagedDemands[focusIdx];
        if (!row) return;
        const on = queueEntries.some((x) => x.no === row.no);
        toggleInQueue(row.no, !on);
        return;
      }
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
  }, [
    confirmOpen,
    addDemandOpen,
    activeNode,
    pagedDemands,
    focusIdx,
    queueEntries,
    toggleInQueue,
    openCreateRfq,
  ]);

  const badgeFor = (key: FlowNodeKey) => (key === 'demand' ? demands.length : nodeBadges[key]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <header className="shrink-0 px-1">
        <p className="text-[10px] tracking-[0.35em] text-muted-foreground">NX02-PO-UI-001-F01</p>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">國內採購工作台</h1>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden rounded-xl border border-border/60 bg-card/30">
        <FlowNav160
          activeNode={activeNode}
          setActiveNode={setActiveNode}
          badgeFor={badgeFor}
          activeNodeIndex={activeNodeIndex}
        />

        <section className="min-w-0 flex-1 overflow-hidden border-r border-border/50 bg-background/40 p-2 sm:p-3">
          {activeNode === 'demand' ? (
            <DemandMiddleColumn
              totalPending={demands.length}
              filteredTotal={filteredDemands.length}
              pagedDemands={pagedDemands}
              effPage={effPage}
              totalPages={totalPages}
              setPage={setPage}
              demandFilter={demandFilter}
              setDemandFilter={setDemandFilter}
              search={search}
              setSearch={setSearch}
              queueEntries={queueEntries}
              toggleInQueue={toggleInQueue}
              focusIdx={focusIdx}
              setFocusIdx={setFocusIdx}
            />
          ) : activeNode === 'rfq' ? (
            <PlaceholderMiddle title="詢價" subtitle="RF 詢價單列表（規格後續補充）" />
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

        <aside className="flex w-[300px] shrink-0 flex-col overflow-y-auto bg-muted/15 p-3">
          {activeNode === 'demand' ? (
            <DemandRightPanel
              queueEntries={queueEntries}
              demandMap={demandMap}
              removeFromQueue={removeFromQueue}
              setEntryQty={setEntryQty}
              vendorSummary={vendorSummary}
              onCreateRfq={openCreateRfq}
              onDragStartRow={onDragStartRow}
              onDragOverAllow={onDragOverAllow}
              onDropRow={onDropRow}
              onDragEnd={onDragEnd}
            />
          ) : activeNode === 'rfq' ? (
            <PlaceholderRight title="詢價編輯" subtitle="詢價明細與廠商選擇（占位）" />
          ) : activeNode === 'po' ? (
            <PlaceholderRight title="採購單審核" subtitle="明細與審核操作（占位）" />
          ) : activeNode === 'rr' ? (
            <PlaceholderRight title="驗收" subtitle="逐筆核對（占位）" />
          ) : activeNode === 'pr' ? (
            <PlaceholderRight title="退貨處置" subtitle="（占位）" />
          ) : (
            <PlaceholderRight title="廠商接洽" subtitle="（占位）" />
          )}
        </aside>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>確認建立詢價單</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-foreground/90">
                <p>即將為以下 {queueEntries.length} 筆需求建立詢價單：</p>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  {queueEntries.map((e) => {
                    const d = demandMap.get(e.no);
                    if (!d) return null;
                    return (
                      <li key={e.no}>
                        {d.partName} × {e.qty} {d.unit ?? '個'}
                      </li>
                    );
                  })}
                </ul>
                <p>系統將依廠商拆分為：</p>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  {splitPreview.map((l) => (
                    <li key={l.rfqNo}>
                      {l.rfqNo} → {l.vendorLabel}（{l.partCount} 料號）
                    </li>
                  ))}
                </ul>
                {hasUnspecifiedVendor ? (
                  <p className="text-amber-700 dark:text-amber-400">⚠️ 無建議廠商的料號將建立未指定詢價單</p>
                ) : null}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={confirmCreateRfq}>
              確認建立
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Label htmlFor="nd-vendor">建議廠商（選填）</Label>
              <Input id="nd-vendor" value={newVendor} onChange={(e) => setNewVendor(e.target.value)} />
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

function DemandMiddleColumn({
  totalPending,
  filteredTotal,
  pagedDemands,
  effPage,
  totalPages,
  setPage,
  demandFilter,
  setDemandFilter,
  search,
  setSearch,
  queueEntries,
  toggleInQueue,
  focusIdx,
  setFocusIdx,
}: {
  totalPending: number;
  filteredTotal: number;
  pagedDemands: MockDemand[];
  effPage: number;
  totalPages: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  demandFilter: DemandFilter;
  setDemandFilter: (f: DemandFilter) => void;
  search: string;
  setSearch: (s: string) => void;
  queueEntries: QueueEntry[];
  toggleInQueue: (no: string, checked: boolean) => void;
  focusIdx: number;
  setFocusIdx: (i: number | ((n: number) => number)) => void;
}) {
  const inQueue = (no: string) => queueEntries.some((e) => e.no === no);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-foreground">採購需求</h2>
        <p className="text-xs text-muted-foreground">
          共 <span className="tabular-nums text-foreground">{totalPending}</span> 筆待處理
          {filteredTotal !== totalPending ? (
            <>
              {' '}
              · 篩選 <span className="tabular-nums text-foreground">{filteredTotal}</span> 筆
            </>
          ) : null}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">篩選：</span>
        {FILTER_CHIPS.map((c) => (
          <Button
            key={c.key}
            type="button"
            size="sm"
            variant={demandFilter === c.key ? 'secondary' : 'outline'}
            className="h-7 px-2 text-xs"
            onClick={() => setDemandFilter(c.key)}
          >
            {c.label}
          </Button>
        ))}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="料號 / 品名"
          autoComplete="off"
          className="ml-auto h-7 min-w-[8rem] max-w-[14rem] flex-1 text-xs"
          aria-label="搜尋料號品名"
        />
      </div>

      <div
        role="listbox"
        aria-label="採購需求單列表"
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden"
      >
        {pagedDemands.map((d, idx) => {
          const checked = inQueue(d.no);
          const focused = idx === focusIdx;
          const urgent = d.isUrgent;

          const onCardActivate = () => {
            setFocusIdx(idx);
            toggleInQueue(d.no, !checked);
          };

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
                'grid cursor-pointer grid-cols-[20px_1fr_180px_90px] items-center gap-x-2 gap-y-0 rounded-md border px-2 py-1.5 text-left transition-colors max-sm:grid-cols-1 max-sm:gap-y-2',
                checked && 'border-amber-500/70 bg-amber-500/10 shadow-sm',
                !checked && 'border-border/60 bg-card/50 hover:bg-muted/30',
                focused && 'ring-1 ring-amber-500/40',
                urgent && 'border-l-2 border-l-red-500',
              )}
              onMouseEnter={() => setFocusIdx(idx)}
            >
              <div className="pointer-events-none flex h-full items-center justify-center" aria-hidden>
                <span
                  className={cx(
                    'flex size-[18px] shrink-0 items-center justify-center rounded border-2 transition-colors',
                    checked
                      ? 'border-amber-500 bg-amber-500 text-black'
                      : 'border-muted-foreground/50 bg-transparent',
                  )}
                >
                  {checked ? <Check className="size-3.5 stroke-[3]" /> : null}
                </span>
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0 text-[11px] leading-tight">
                  {d.source === 'system' ? (
                    <>
                      <span className="shrink-0 rounded bg-sky-600/18 px-1 py-0.5 font-medium text-sky-900 dark:text-sky-100">
                        系統自動
                      </span>
                      {d.suggestedVendor ? (
                        <span className="max-w-[8rem] truncate text-muted-foreground">{d.suggestedVendor}</span>
                      ) : null}
                      <span className="min-w-0 truncate font-medium text-foreground">{d.partName}</span>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{d.partCode}</span>
                    </>
                  ) : (
                    <>
                      <span className="shrink-0 rounded bg-orange-500/18 px-1 py-0.5 font-medium text-orange-900 dark:text-orange-100">
                        業務提交
                      </span>
                      {d.isUrgent ? (
                        <span className="shrink-0 rounded bg-red-600/18 px-1 py-0.5 font-medium text-red-900 dark:text-red-100">
                          緊急
                        </span>
                      ) : null}
                      <span className="max-w-[10rem] truncate text-muted-foreground">
                        {d.salesName}｜{d.customerName ?? '—'}
                      </span>
                      <span className="min-w-0 truncate font-medium text-foreground">{d.partName}</span>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{d.partCode}</span>
                    </>
                  )}
                </div>
                {d.remark ? (
                  <p className="line-clamp-2 text-[10px] italic text-muted-foreground/90">{d.remark}</p>
                ) : null}
              </div>

              <StockVisual d={d} />

              <div className="flex flex-col items-end justify-center pr-0.5 text-right">
                <span className="text-lg font-semibold tabular-nums leading-none text-foreground">{d.qty}</span>
                <span className="text-[9px] text-muted-foreground">需求量</span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="flex shrink-0 items-center justify-center gap-0.5 border-t border-border/50 pt-2"
        role="navigation"
        aria-label="分頁"
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 shrink-0"
          disabled={effPage <= 1}
          onClick={() => setPage(1)}
          aria-label="第一頁"
        >
          <ChevronsLeft className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 shrink-0"
          disabled={effPage <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          aria-label="上一頁"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <span className="min-w-[3.5rem] px-2 text-center text-xs tabular-nums text-muted-foreground">
          {effPage}/{totalPages}
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 shrink-0"
          disabled={effPage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          aria-label="下一頁"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 shrink-0"
          disabled={effPage >= totalPages}
          onClick={() => setPage(totalPages)}
          aria-label="最後一頁"
        >
          <ChevronsRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function DemandRightPanel({
  queueEntries,
  demandMap,
  removeFromQueue,
  setEntryQty,
  vendorSummary,
  onCreateRfq,
  onDragStartRow,
  onDragOverAllow,
  onDropRow,
  onDragEnd,
}: {
  queueEntries: QueueEntry[];
  demandMap: Map<string, MockDemand>;
  removeFromQueue: (no: string) => void;
  setEntryQty: (no: string, qty: number) => void;
  vendorSummary: [string, number][];
  onCreateRfq: () => void;
  onDragStartRow: (no: string) => () => void;
  onDragOverAllow: (e: React.DragEvent) => void;
  onDropRow: (no: string) => (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">待詢價清單</h2>
        {queueEntries.length > 0 ? (
          <span className="text-xs tabular-nums text-muted-foreground">{queueEntries.length} 筆</span>
        ) : null}
      </div>

      {queueEntries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
          <p>尚未選取需求單</p>
          <p className="mt-1 text-xs">← 從左側勾選需求單加入</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {queueEntries.map((e) => {
              const d = demandMap.get(e.no);
              if (!d) return null;
              return (
                <li
                  key={e.no}
                  draggable
                  onDragStart={onDragStartRow(e.no)}
                  onDragOver={onDragOverAllow}
                  onDrop={onDropRow(e.no)}
                  onDragEnd={onDragEnd}
                  className="cursor-grab rounded-lg border border-border/50 bg-card/50 p-2.5 text-xs active:cursor-grabbing"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-mono font-medium text-foreground">{d.no}</p>
                        <p className="text-foreground">
                          {d.partName} × {e.qty} {d.unit ?? '個'}
                        </p>
                        <p>
                          {d.source === 'system' ? (
                            <span className="rounded bg-sky-600/15 px-1 py-0.5 text-[10px] font-medium text-sky-800 dark:text-sky-200">
                              系統自動
                            </span>
                          ) : (
                            <span className="rounded bg-orange-500/15 px-1 py-0.5 text-[10px] font-medium text-orange-800 dark:text-orange-200">
                              業務提交
                            </span>
                          )}
                          {d.isUrgent ? (
                            <span className="ml-1 rounded bg-red-600/15 px-1 py-0.5 text-[10px] font-medium text-red-800 dark:text-red-200">
                              緊急
                            </span>
                          ) : null}{' '}
                          <span className="text-muted-foreground">{d.suggestedVendor ?? '未指定廠商'}</span>
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label="移除"
                        onClick={() => removeFromQueue(e.no)}
                      >
                        ×
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-end gap-2 border-t border-border/30 pt-2">
                      <Label htmlFor={`rqty-${e.no}`} className="text-[10px] text-muted-foreground">
                        詢價數量
                      </Label>
                      <Input
                        id={`rqty-${e.no}`}
                        type="number"
                        min={1}
                        className="h-8 w-[5.25rem] text-xs tabular-nums"
                        value={e.qty}
                        onClick={(ev) => ev.stopPropagation()}
                        onChange={(ev) => {
                          const v = parseInt(ev.target.value, 10);
                          if (!Number.isNaN(v)) setEntryQty(e.no, v);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] text-muted-foreground"
                        onClick={() => setEntryQty(e.no, defaultRfqQty(d))}
                      >
                        重設補滿
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-border/50 pt-2">
            <p className="mb-1 text-xs font-medium text-foreground">涉及廠商：</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {vendorSummary.map(([v, n]) => (
                <li key={v}>
                  {v} → {n} 個料號
                </li>
              ))}
            </ul>
          </div>
          <Button type="button" className="mt-auto w-full" onClick={onCreateRfq}>
            建立詢價單 <span className="ml-1 text-[10px] font-normal opacity-80">Alt+S</span>
          </Button>
        </>
      )}
    </div>
  );
}
