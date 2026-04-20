/**
 * @FUNCTION_CODE NX02-PO-UI-001-F01
 * 國內採購工作台：三欄流程（可展開採購中心式流程列、主檔式列表控制器、待詢價數量）
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  MessageCircleQuestion,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Truck,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cx } from '@/shared/lib/cx';
import { hubShellMotion } from '@/features/layout/ui/module-hub/hub-primitives';
import type { DemandSource, FlowNodeKey, MockDemand, NodeBadges } from './mock-data';
import {
  INITIAL_NODE_BADGES,
  buildRfqSplitPreview,
  cloneInitialDemands,
  defaultRfqQty,
} from './mock-data';

const PAGE_SIZE = 6;

const FLOW: { key: FlowNodeKey; label: string; Icon: LucideIcon }[] = [
  { key: 'demand', label: '需求', Icon: ClipboardList },
  { key: 'rfq', label: '詢價', Icon: MessageCircleQuestion },
  { key: 'po', label: '採購單', Icon: ShoppingCart },
  { key: 'rr', label: '進貨單', Icon: Truck },
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

type QueueEntry = { no: string; qty: number };

function filterSummary(f: DemandFilter): string {
  switch (f) {
    case 'all':
      return '篩選：全部';
    case 'system':
      return '篩選：系統自動';
    case 'sales':
      return '篩選：業務提交';
    case 'urgent_priority':
      return '篩選：緊急優先';
    default:
      return '篩選';
  }
}

export function PurchaseDomesticWorkbenchView() {
  const [activeNode, setActiveNode] = useState<FlowNodeKey>('demand');
  const [flowExpanded, setFlowExpanded] = useState(false);
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

  const selectAllPage = useCallback(
    (checked: boolean) => {
      const nos = pagedDemands.map((d) => d.no);
      if (!checked) {
        setQueueEntries((prev) => prev.filter((e) => !nos.includes(e.no)));
        return;
      }
      setQueueEntries((prev) => {
        const prevMap = new Map(prev.map((e) => [e.no, e]));
        const rest = prev.filter((e) => !nos.includes(e.no));
        const head: QueueEntry[] = pagedDemands.map((d) => {
          const ex = prevMap.get(d.no);
          return { no: d.no, qty: ex?.qty ?? defaultRfqQty(d) };
        });
        return [...head, ...rest];
      });
    },
    [pagedDemands],
  );

  const allPageChecked =
    pagedDemands.length > 0 && pagedDemands.every((d) => queueEntries.some((e) => e.no === d.no));

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
    setNodeBadges((b) => ({
      ...b,
      rfq: b.rfq + nRf,
    }));
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
          const idx = parseInt(k, 10) - 1;
          setActiveNode(FLOW[idx]!.key);
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
        const on = queueEntries.some((e) => e.no === row.no);
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

  const flowNavProps = {
    activeNode,
    setActiveNode,
    badgeFor,
    activeNodeIndex,
  };

  const workRow = (
    <>
      <section className="min-w-0 flex-1 overflow-y-auto border-r border-border/50 bg-background/40 p-3">
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
            selectAllPage={selectAllPage}
            allPageChecked={allPageChecked}
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
      <aside className="flex w-[min(26rem,40vw)] min-w-[17.5rem] shrink-0 flex-col overflow-y-auto bg-muted/15 p-3 sm:min-w-[20rem]">
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
    </>
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <header className="flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <p className="text-[10px] tracking-[0.35em] text-muted-foreground">NX02-PO-UI-001-F01</p>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">國內採購工作台</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => setFlowExpanded((v) => !v)}
        >
          {flowExpanded ? '收合流程列' : '展開流程列（滿寬）'}
        </Button>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/30">
        {flowExpanded ? (
          <>
            <ExpandedFlowHub {...flowNavProps} onCollapse={() => setFlowExpanded(false)} />
            <div className="flex min-h-0 min-w-0 flex-1 flex-row">{workRow}</div>
          </>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-row">
            <CompactFlowRail {...flowNavProps} />
            {workRow}
          </div>
        )}
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

function CompactFlowRail({
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
      className="flex w-[5.75rem] shrink-0 flex-col gap-1.5 border-r border-border/50 bg-muted/20 p-2"
      aria-label="採購流程節點"
    >
      {FLOW.map((node, i) => {
        const selected = activeNode === node.key;
        const badge = badgeFor(node.key);
        const completed = i < activeNodeIndex;
        const below = i > activeNodeIndex;
        const hollowGray = below && badge === 0;
        const hollowGreen = completed;
        const showBadge = badge > 0;
        const Icon = node.Icon;
        return (
          <button
            key={node.key}
            type="button"
            onClick={() => setActiveNode(node.key)}
            title={node.label}
            className={cx(
              'relative flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[10px] transition-colors',
              selected
                ? 'border-amber-500/70 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                : 'border-border/50 bg-card/30 text-muted-foreground hover:bg-muted/40',
            )}
          >
            <span className="relative flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-background/80">
              <Icon className="size-4 opacity-90" aria-hidden />
              {showBadge ? (
                <span className="absolute -right-1 -top-1 flex min-w-[1rem] items-center justify-center rounded-full bg-orange-500 px-0.5 text-[9px] font-bold leading-none text-white">
                  {badge > 99 ? '99+' : badge}
                </span>
              ) : null}
            </span>
            <span className={cx('line-clamp-2 w-full text-center font-medium leading-tight', selected && 'text-amber-700 dark:text-amber-300')}>
              {node.label}
            </span>
            <span className="sr-only">
              {selected ? '目前' : hollowGreen ? '已完成' : hollowGray ? '無待辦' : '待辦'}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function ExpandedFlowHub({
  activeNode,
  setActiveNode,
  badgeFor,
  activeNodeIndex,
  onCollapse,
}: {
  activeNode: FlowNodeKey;
  setActiveNode: (k: FlowNodeKey) => void;
  badgeFor: (k: FlowNodeKey) => number;
  activeNodeIndex: number;
  onCollapse: () => void;
}) {
  const motion = hubShellMotion();
  return (
    <div className="shrink-0 border-b border-border/50 bg-muted/10 p-2 sm:p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">採購流程（採購中心版型）</p>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onCollapse}>
          收合
        </Button>
      </div>
      <div className="flex min-w-0 flex-wrap gap-2">
        {FLOW.map((node, i) => {
          const selected = activeNode === node.key;
          const badge = badgeFor(node.key);
          const completed = i < activeNodeIndex;
          const Icon = node.Icon;
          return (
            <button
              key={node.key}
              type="button"
              onClick={() => setActiveNode(node.key)}
              className={cx(
                'glass-card flex min-h-[100px] min-w-[140px] flex-1 basis-[140px] flex-col rounded-xl border p-3 text-left shadow-sm transition-colors',
                motion,
                selected
                  ? 'border-amber-500/70 bg-amber-500/10 ring-1 ring-amber-500/40'
                  : completed
                    ? 'border-emerald-600/30 bg-emerald-500/5'
                    : 'border-border/70 bg-card/40',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-secondary/40 text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                {badge > 0 ? (
                  <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">—</span>
                )}
              </div>
              <p className={cx('mt-2 text-sm font-semibold', selected && 'text-amber-700 dark:text-amber-300')}>
                {node.label}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {selected ? '進行中' : completed ? '已完成階段' : '待進入'}
              </p>
            </button>
          );
        })}
      </div>
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
  selectAllPage,
  allPageChecked,
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
  selectAllPage: (checked: boolean) => void;
  allPageChecked: boolean;
  focusIdx: number;
  setFocusIdx: (i: number | ((n: number) => number)) => void;
}) {
  const inQueue = (no: string) => queueEntries.some((e) => e.no === no);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
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

      <div className="relative flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/15 p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 justify-between gap-1 px-2.5 font-normal sm:min-w-[9.5rem]"
            >
              <span className="truncate">{filterSummary(demandFilter)}</span>
              <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">需求來源／排序</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={demandFilter}
              onValueChange={(v) => setDemandFilter(v as DemandFilter)}
            >
              <DropdownMenuRadioItem value="all">全部</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">系統自動</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="sales">業務提交</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="urgent_priority">緊急優先</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div
          className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-background/60 p-0.5"
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
          <span className="min-w-[3.25rem] px-1 text-center text-xs tabular-nums text-muted-foreground">
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

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="料號、品名…"
          autoComplete="off"
          className="h-9 min-w-[min(100%,8rem)] flex-1 basis-[min(100%,12rem)] text-sm"
          aria-label="搜尋料號品名"
        />
      </div>

      <div role="listbox" aria-label="採購需求單列表" className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-2 border-b border-border/40 pb-1.5">
          <input
            type="checkbox"
            className="size-4 rounded border border-input accent-amber-600"
            checked={allPageChecked}
            onChange={(e) => selectAllPage(e.target.checked)}
            aria-label="全選本頁需求單"
          />
          <span className="text-xs text-muted-foreground">全選本頁（每頁 {PAGE_SIZE} 筆）</span>
        </div>
        <div className="flex flex-col gap-2">
          {pagedDemands.map((d, idx) => {
            const checked = inQueue(d.no);
            const focused = idx === focusIdx;
            return (
              <div
                key={d.no}
                role="option"
                aria-selected={focused}
                className={cx(
                  'rounded-lg border p-2.5 transition-colors sm:p-3',
                  checked ? 'border-amber-500/40 bg-amber-500/5' : 'border-border/60 bg-card/40',
                  focused && 'ring-1 ring-amber-500/50',
                )}
                onMouseEnter={() => setFocusIdx(idx)}
                onClick={() => setFocusIdx(idx)}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 rounded border border-amber-600/80 accent-amber-600"
                    checked={checked}
                    onChange={(e) => toggleInQueue(d.no, e.target.checked)}
                    aria-label={`選取 ${d.no}`}
                  />
                  <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-mono text-sm font-medium text-foreground">{d.no}</span>
                        <span className="text-xs text-muted-foreground">{d.date}</span>
                      </div>
                      <p className="font-mono text-[11px] text-muted-foreground">{d.partCode}</p>
                      <p className="text-sm text-foreground">{d.partName}</p>
                      <p className="text-xs text-muted-foreground">
                        需求單量：<span className="tabular-nums">{d.qty}</span> {d.unit ?? '個'}
                      </p>
                      {d.source === 'system' ? (
                        <p className="text-xs">
                          <span className="rounded bg-sky-600/15 px-1.5 py-0.5 font-medium text-sky-800 dark:text-sky-200">
                            系統自動
                          </span>{' '}
                          <span className="text-muted-foreground">低於安全量觸發</span>
                        </p>
                      ) : (
                        <p className="text-xs">
                          <span className="rounded bg-orange-500/15 px-1.5 py-0.5 font-medium text-orange-800 dark:text-orange-200">
                            業務提交
                          </span>
                          {d.isUrgent ? (
                            <span className="ml-1 rounded bg-red-600/15 px-1.5 py-0.5 font-medium text-red-800 dark:text-red-200">
                              🔴 緊急
                            </span>
                          ) : null}{' '}
                          <span className="text-muted-foreground">
                            {d.salesName}｜客戶：{d.customerName ?? '—'}
                          </span>
                        </p>
                      )}
                      {d.source === 'system' && d.suggestedVendor ? (
                        <p className="text-xs text-muted-foreground">建議廠商：{d.suggestedVendor}</p>
                      ) : null}
                      {d.remark ? (
                        <p className="text-xs text-amber-900/90 dark:text-amber-200/90">備註：{d.remark}</p>
                      ) : null}
                    </div>
                    <div className="grid w-full shrink-0 grid-cols-3 gap-1.5 rounded-lg border border-border/50 bg-muted/25 px-2 py-2 text-center sm:w-[13.5rem]">
                      <div>
                        <div className="text-[10px] font-medium text-muted-foreground">現庫</div>
                        <div className="text-sm font-semibold tabular-nums text-foreground">{d.currentStock}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium text-muted-foreground">安全量</div>
                        <div className="text-sm font-semibold tabular-nums text-foreground">{d.safetyStock}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium text-muted-foreground">最高量</div>
                        <div className="text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                          {d.maxStock}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
          <p className="mt-1 text-xs">← 從左側勾選加入；數量預設為補滿至「最高量」</p>
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
                        <p className="text-foreground">{d.partName}</p>
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
                              🔴 緊急
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
                    <div className="flex flex-wrap items-end gap-2">
                      <Label htmlFor={`rqty-${e.no}`} className="text-[10px] text-muted-foreground">
                        詢價數量
                      </Label>
                      <Input
                        id={`rqty-${e.no}`}
                        type="number"
                        min={1}
                        className="h-8 w-[5.5rem] text-xs tabular-nums"
                        value={e.qty}
                        onChange={(ev) => {
                          const v = parseInt(ev.target.value, 10);
                          if (!Number.isNaN(v)) setEntryQty(e.no, v);
                        }}
                      />
                      <span className="pb-1 text-[10px] text-muted-foreground">{d.unit ?? '個'}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] text-muted-foreground"
                        onClick={() => setEntryQty(e.no, defaultRfqQty(d))}
                      >
                        重設為補滿
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
