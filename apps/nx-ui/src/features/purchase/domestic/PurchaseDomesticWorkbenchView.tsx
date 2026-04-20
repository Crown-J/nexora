/**
 * @FUNCTION_CODE NX02-PO-UI-001-F01
 * 國內採購工作台：三欄流程（需求節點完整 mock，其餘占位）
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { DemandSource, FlowNodeKey, MockDemand, NodeBadges, RfqSplitLine } from './mock-data';
import {
  INITIAL_NODE_BADGES,
  buildRfqSplitPreview,
  cloneInitialDemands,
} from './mock-data';

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

export function PurchaseDomesticWorkbenchView() {
  const [activeNode, setActiveNode] = useState<FlowNodeKey>('demand');
  const [demands, setDemands] = useState<MockDemand[]>(() => cloneInitialDemands());
  const [nodeBadges, setNodeBadges] = useState<NodeBadges>(() => ({ ...INITIAL_NODE_BADGES }));
  const [demandFilter, setDemandFilter] = useState<DemandFilter>('all');
  const [search, setSearch] = useState('');
  /** 待詢價清單順序（料號排序影響詢價明細） */
  const [queueNos, setQueueNos] = useState<string[]>([]);
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

  const queueOrdered = useMemo(
    () => queueNos.map((no) => demandMap.get(no)).filter(Boolean) as MockDemand[],
    [queueNos, demandMap],
  );

  const splitPreview = useMemo(() => buildRfqSplitPreview(queueOrdered), [queueOrdered]);

  const hasUnspecifiedVendor = splitPreview.some((l) => l.unspecified);

  const activeNodeIndex = FLOW.findIndex((n) => n.key === activeNode);

  const toggleInQueue = useCallback((no: string, checked: boolean) => {
    setQueueNos((prev) => {
      if (checked) {
        if (prev.includes(no)) return prev;
        return [...prev, no];
      }
      return prev.filter((x) => x !== no);
    });
  }, []);

  const selectAllVisible = useCallback(
    (checked: boolean) => {
      const nos = filteredDemands.map((d) => d.no);
      if (!checked) {
        setQueueNos((prev) => prev.filter((n) => !nos.includes(n)));
        return;
      }
      setQueueNos((prev) => {
        const tail = prev.filter((n) => !nos.includes(n));
        return [...nos, ...tail];
      });
    },
    [filteredDemands],
  );

  const allVisibleChecked =
    filteredDemands.length > 0 && filteredDemands.every((d) => queueNos.includes(d.no));

  const removeFromQueue = useCallback((no: string) => {
    setQueueNos((prev) => prev.filter((x) => x !== no));
  }, []);

  const onDragStartRow = (no: string) => () => setDragNo(no);
  const onDragOverAllow = (e: React.DragEvent) => e.preventDefault();
  const onDropRow = (no: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragNo;
    setDragNo(null);
    if (!from || from === no) return;
    setQueueNos((prev) => {
      const i = prev.indexOf(from);
      const j = prev.indexOf(no);
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
    for (const d of queueOrdered) {
      const v = d.suggestedVendor ?? '（未指定廠商）';
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()];
  }, [queueOrdered]);

  const openCreateRfq = useCallback(() => {
    if (activeNode !== 'demand' || queueOrdered.length === 0) return;
    setConfirmOpen(true);
  }, [activeNode, queueOrdered.length]);

  const confirmCreateRfq = useCallback(() => {
    const nos = new Set(queueOrdered.map((d) => d.no));
    const nRf = splitPreview.length;
    setDemands((prev) => prev.filter((d) => !nos.has(d.no)));
    setQueueNos([]);
    setConfirmOpen(false);
    setNodeBadges((b) => ({
      ...b,
      rfq: b.rfq + nRf,
    }));
    setActiveNode('rfq');
  }, [queueOrdered, splitPreview.length]);

  const saveNewDemand = useCallback(() => {
    const name = newPartName.trim();
    const code = newPartCode.trim() || `PART-${Date.now()}`;
    if (!name) return;
    const qty = Math.max(1, parseInt(newQty, 10) || 1);
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
      safetyStock: 0,
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
    setFocusIdx((i) => Math.min(Math.max(0, i), Math.max(0, filteredDemands.length - 1)));
  }, [filteredDemands.length]);

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
      if (e.key === ' ' && filteredDemands.length > 0) {
        e.preventDefault();
        const row = filteredDemands[focusIdx];
        if (!row) return;
        const on = queueNos.includes(row.no);
        toggleInQueue(row.no, !on);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredDemands.length === 0) return;
        setFocusIdx((i) => Math.min(filteredDemands.length - 1, i + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredDemands.length === 0) return;
        setFocusIdx((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    confirmOpen,
    addDemandOpen,
    activeNode,
    filteredDemands,
    focusIdx,
    queueNos,
    toggleInQueue,
    openCreateRfq,
  ]);

  const badgeFor = (key: FlowNodeKey) => (key === 'demand' ? demands.length : nodeBadges[key]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <header className="shrink-0 px-1">
        <p className="text-[10px] tracking-[0.35em] text-muted-foreground">NX02-PO-UI-001-F01</p>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">國內採購工作台</h1>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 gap-0 overflow-hidden rounded-xl border border-border/60 bg-card/30">
        {/* 左欄 160px */}
        <nav
          className="flex w-[160px] shrink-0 flex-col border-r border-border/50 bg-muted/20 py-4 pl-3 pr-2"
          aria-label="採購流程節點"
        >
          <ul className="relative flex flex-col gap-0">
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
                    <div
                      className="absolute top-0 left-[7px] h-3 w-px -translate-y-full bg-border"
                      aria-hidden
                    />
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

        {/* 中欄 */}
        <section className="min-w-0 flex-1 overflow-y-auto border-r border-border/50 bg-background/40 p-3">
          {activeNode === 'demand' ? (
            <DemandMiddleColumn
              totalPending={demands.length}
              filteredDemands={filteredDemands}
              demandFilter={demandFilter}
              setDemandFilter={setDemandFilter}
              search={search}
              setSearch={setSearch}
              queueNos={queueNos}
              toggleInQueue={toggleInQueue}
              selectAllVisible={selectAllVisible}
              allVisibleChecked={allVisibleChecked}
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

        {/* 右欄 300px */}
        <aside className="flex w-[300px] shrink-0 flex-col overflow-y-auto bg-muted/15 p-3">
          {activeNode === 'demand' ? (
            <DemandRightPanel
              queueOrdered={queueOrdered}
              removeFromQueue={removeFromQueue}
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
                <p>即將為以下 {queueOrdered.length} 筆需求建立詢價單：</p>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  {queueOrdered.map((d) => (
                    <li key={d.no}>
                      {d.partName} × {d.qty} {d.unit ?? '個'}
                    </li>
                  ))}
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

function DemandMiddleColumn({
  totalPending,
  filteredDemands,
  demandFilter,
  setDemandFilter,
  search,
  setSearch,
  queueNos,
  toggleInQueue,
  selectAllVisible,
  allVisibleChecked,
  focusIdx,
  setFocusIdx,
}: {
  totalPending: number;
  filteredDemands: MockDemand[];
  demandFilter: DemandFilter;
  setDemandFilter: (f: DemandFilter) => void;
  search: string;
  setSearch: (s: string) => void;
  queueNos: string[];
  toggleInQueue: (no: string, checked: boolean) => void;
  selectAllVisible: (checked: boolean) => void;
  allVisibleChecked: boolean;
  focusIdx: number;
  setFocusIdx: (i: number | ((n: number) => number)) => void;
}) {
  const chips: { key: DemandFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'system', label: '系統自動' },
    { key: 'sales', label: '業務提交' },
    { key: 'urgent_priority', label: '緊急優先' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">採購需求</h2>
          <p className="text-xs text-muted-foreground">
            共 {totalPending} 筆待處理
            {filteredDemands.length !== totalPending ? `（篩選後 ${filteredDemands.length} 筆）` : ''}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">篩選：</span>
        {chips.map((c) => (
          <Button
            key={c.key}
            type="button"
            size="sm"
            variant={demandFilter === c.key ? 'secondary' : 'outline'}
            className="h-7 text-xs"
            onClick={() => setDemandFilter(c.key)}
          >
            {c.label}
          </Button>
        ))}
      </div>
      <div className="max-w-md">
        <Label htmlFor="dem-search" className="sr-only">
          搜尋料號品名
        </Label>
        <Input
          id="dem-search"
          placeholder="搜尋：料號 / 品名"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 text-sm"
        />
      </div>

      <div role="listbox" aria-label="採購需求單列表">
        <div className="mb-2 flex items-center gap-2 border-b border-border/40 pb-2">
          <input
            type="checkbox"
            className="size-4 rounded border border-input accent-amber-600"
            checked={allVisibleChecked}
            onChange={(e) => selectAllVisible(e.target.checked)}
            aria-label="全選可見需求單"
          />
          <span className="text-xs text-muted-foreground">全選</span>
        </div>
        <div className="flex flex-col gap-2">
          {filteredDemands.map((d, idx) => {
            const checked = queueNos.includes(d.no);
            const focused = idx === focusIdx;
            return (
              <div
                key={d.no}
                role="option"
                aria-selected={focused}
                className={cx(
                  'rounded-lg border p-3 transition-colors',
                  checked ? 'border-amber-500/40 bg-amber-500/5' : 'border-border/60 bg-card/40',
                  focused && 'ring-1 ring-amber-500/50',
                )}
                onMouseEnter={() => setFocusIdx(idx)}
                onClick={() => setFocusIdx(idx)}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 rounded border border-amber-600/80 accent-amber-600"
                    checked={checked}
                    onChange={(e) => toggleInQueue(d.no, e.target.checked)}
                    aria-label={`選取 ${d.no}`}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-mono text-sm font-medium text-foreground">{d.no}</span>
                      <span className="text-xs text-muted-foreground">{d.date}</span>
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground">{d.partCode}</p>
                    <p className="text-sm text-foreground">{d.partName}</p>
                    <p className="text-xs text-muted-foreground">
                      需求量：{d.qty} {d.unit ?? '個'}
                    </p>
                    {d.source === 'system' ? (
                      <p className="text-xs">
                        <span className="rounded bg-sky-600/15 px-1.5 py-0.5 font-medium text-sky-800 dark:text-sky-200">
                          系統自動
                        </span>{' '}
                        <span className="text-muted-foreground">
                          低於安全量（現存 {d.currentStock} {d.unit ?? '個'}，安全量 {d.safetyStock}）
                        </span>
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
                    {d.remark ? <p className="text-xs text-amber-900/90 dark:text-amber-200/90">備註：{d.remark}</p> : null}
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
  queueOrdered,
  removeFromQueue,
  vendorSummary,
  onCreateRfq,
  onDragStartRow,
  onDragOverAllow,
  onDropRow,
  onDragEnd,
}: {
  queueOrdered: MockDemand[];
  removeFromQueue: (no: string) => void;
  vendorSummary: [string, number][];
  onCreateRfq: () => void;
  onDragStartRow: (no: string) => () => void;
  onDragOverAllow: (e: React.DragEvent) => void;
  onDropRow: (no: string) => (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">待詢價清單</h2>
        {queueOrdered.length > 0 ? (
          <span className="text-xs tabular-nums text-muted-foreground">{queueOrdered.length} 筆</span>
        ) : null}
      </div>

      {queueOrdered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
          <p>尚未選取需求單</p>
          <p className="mt-1 text-xs">← 從左側勾選需求單加入</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {queueOrdered.map((d) => (
              <li
                key={d.no}
                draggable
                onDragStart={onDragStartRow(d.no)}
                onDragOver={onDragOverAllow}
                onDrop={onDropRow(d.no)}
                onDragEnd={onDragEnd}
                className="cursor-grab rounded-lg border border-border/50 bg-card/50 p-2.5 text-xs active:cursor-grabbing"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-mono font-medium text-foreground">{d.no}</p>
                    <p className="text-foreground">
                      {d.partName} × {d.qty} {d.unit ?? '個'}
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
                    onClick={() => removeFromQueue(d.no)}
                  >
                    ×
                  </Button>
                </div>
              </li>
            ))}
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
