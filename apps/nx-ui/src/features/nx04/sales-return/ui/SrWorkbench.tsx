// apps/nx-ui/src/features/nx04/sales-return/ui/SrWorkbench.tsx
// NX04-QT-SHELL：銷退單工作區（比照 SoWorkbench 單據模板六層外殼）
//   L4 資料瀏覽/詳細 同頁分頁；MasterTable（拉寬/拖序/記憶）；查詢＝狀態+關鍵字（單號/客戶/來源銷貨單）
'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { MasterPageHead } from '@/features/nx01/shell/master-nav';
import { ErpToolbar, type ExportFormat } from '@/features/nx01/shell/ui/ErpToolbar';
import { MasterTable, type MasterTableColumn } from '@/features/nx01/shell/ui/MasterTable';
import type { MasterTab } from '@/features/nx01/shell/entity-master/MasterTabs';
import { TieredFormProvider } from '@/features/shared/tiered-form/TieredFormProvider';

import { listSr, voidSr } from '@data/endpoints/nx04/sales-return/api/sales-return';
import type { Sr, SrStatus } from '@data/types/nx04/sales-return';
import { SR_STATUSES, SR_STATUS_LABEL } from '@data/types/nx04/sales-return';

import { SrCreatePanel, SrDetailPanel, SR_METHOD_LABEL } from './SrDetailView.new';

const COL_ORDER_KEY = 'nx04.sr.list.colOrder';
const COL_WIDTH_KEY = 'nx04.sr.list.colWidths';
function loadJSON<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function saveJSON(key: string, val: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

const DEFAULT_WIDTHS: Record<string, number> = {
  docNo: 170,
  status: 110,
  createdAt: 110,
  srDate: 110,
  customerCode: 110,
  customerName: 180,
  soDocNo: 160,
  returnMethod: 110,
  createdByName: 100,
  itemCount: 80,
  totalAmount: 120,
};

const STATUS_CLS: Record<string, string> = {
  DRAFT: 'bg-zinc-200 text-zinc-700',
  INSPECTING: 'bg-amber-100 text-amber-800',
  POSTED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-zinc-100 text-zinc-500',
};
const fmtMoney = (n: string | number) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

type SrCriteria = { status?: string; search?: string };
function countCriteria(c: SrCriteria): number {
  return Object.values(c).filter((v) => v != null && String(v).trim() !== '').length;
}

export function SrWorkbench({ initialId, initialTab = 'list' }: { initialId?: string; initialTab?: MasterTab }) {
  const [tab, setTab] = useState<MasterTab>(initialId ? 'detail' : initialTab);
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);
  const [rows, setRows] = useState<Sr[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [enterEditItems, setEnterEditItems] = useState(false);
  const [enterEditHeader, setEnterEditHeader] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [criteria, setCriteria] = useState<SrCriteria>({});
  const [sortKey, setSortKey] = useState<string | null>('docNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [colOrder, setColOrder] = useState<string[] | null>(() => loadJSON<string[]>(COL_ORDER_KEY));
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => loadJSON<Record<string, number>>(COL_WIDTH_KEY) ?? DEFAULT_WIDTHS);

  const reload = useCallback(async () => {
    try {
      const resp = await listSr({
        pageSize: 100,
        status: criteria.status?.trim() || undefined,
        search: criteria.search?.trim() || undefined,
      });
      setRows(resp.items);
      setTotal(resp.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '列表載入失敗');
    }
  }, [criteria]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (tab === 'list') {
      if (enterEditItems) setEnterEditItems(false);
      if (enterEditHeader) setEnterEditHeader(false);
    }
  }, [tab, enterEditItems, enterEditHeader]);

  const displayRows = useMemo(() => {
    if (!sortKey) return rows;
    const dir = sortOrder === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const an = Number(av);
      const bn = Number(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return (an - bn) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }, [rows, sortKey, sortOrder]);
  const activeCount = countCriteria(criteria);

  useEffect(() => {
    if (tab !== 'list') return;
    let next: string | null | undefined;
    if (!displayRows.length) next = selectedId ? null : undefined;
    else if (!displayRows.some((r) => r.id === selectedId)) next = displayRows[0].id;
    if (next !== undefined) setSelectedId(next);
  }, [displayRows, tab, selectedId]);

  const idx = selectedId ? displayRows.findIndex((r) => r.id === selectedId) : -1;
  const itemIndex = idx >= 0 ? idx + 1 : 0;
  const selected = idx >= 0 ? displayRows[idx] : null;
  const selectAt = (i: number) => {
    const r = displayRows[i];
    if (r) setSelectedId(r.id);
  };
  const openDetail = (id: string, opts?: { editItems?: boolean; editHeader?: boolean }) => {
    setCreating(false);
    setEnterEditItems(!!opts?.editItems);
    setEnterEditHeader(!!opts?.editHeader);
    setSelectedId(id);
    setTab('detail');
  };
  const openEdit = () => {
    if (selectedId) openDetail(selectedId, { editHeader: true });
  };
  const startCreate = () => {
    setCreating(true);
    setTab('detail');
  };

  useEffect(() => {
    if (tab !== 'list' || !selectedId) return;
    document.querySelector(`[data-row-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId, tab]);

  const handleCancel = () => {
    if (!selected) return;
    if (selected.status !== 'DRAFT' && selected.status !== 'INSPECTING') {
      alert('此狀態不可取消（僅草稿 / 驗收中可取消）');
      return;
    }
    const reason = window.prompt(`取消銷退單 ${selected.docNo}？請輸入原因（必填）`);
    if (!reason?.trim()) return;
    void (async () => {
      try {
        await voidSr(selected.id, reason.trim());
        await reload();
      } catch (e) {
        alert(e instanceof Error ? e.message : '取消失敗');
      }
    })();
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const inField = !!t && ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName);
      const modalOpen = searchOpen || creating;
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const k = e.key.toLowerCase();
        const map: Record<string, () => void> = {
          '1': () => setTab('list'),
          '2': () => {
            if (selectedId) setTab('detail');
          },
        };
        if (!modalOpen && tab === 'list') {
          Object.assign(map, {
            a: startCreate,
            f: () => setSearchOpen(true),
            r: () => void reload(),
            e: openEdit,
            d: () => handleCancel(),
            p: () => alert('列印開發中'),
            o: () => setExportMenuOpen(true),
          });
        }
        const fn = map[k];
        if (fn) {
          e.preventDefault();
          fn();
        }
        return;
      }
      if (modalOpen) return;
      if (e.ctrlKey || e.metaKey) return;
      if (tab === 'list') {
        if (inField) return;
        const active = document.activeElement as HTMLElement | null;
        if (active?.hasAttribute?.('data-row-id')) return;
        const n = displayRows.length;
        if (!n) return;
        const cur = idx < 0 ? 0 : idx;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectAt(Math.min(n - 1, cur + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectAt(Math.max(0, cur - 1));
        } else if (e.key === 'Home') {
          e.preventDefault();
          selectAt(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          selectAt(n - 1);
        } else if (e.key === 'Enter' && selectedId) {
          e.preventDefault();
          openDetail(selectedId);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, creating, searchOpen, displayRows, idx, selectedId]);

  const handleExport = (format: ExportFormat) => {
    if (format !== 'csv') {
      alert('PDF / 列印開發中');
      return;
    }
    const header = ['單號', '狀態', '建單日期', '銷退日期', '客戶編號', '客戶名稱', '來源銷貨單', '退款方式', '建單人員', '項目數', '退款總額'];
    const lines = displayRows.map((r) =>
      [
        r.docNo,
        SR_STATUS_LABEL[r.status] ?? r.status,
        r.createdAt.slice(0, 10),
        r.srDate.slice(0, 10),
        r.customerCode ?? '',
        r.customerName ?? r.customerId,
        r.soDocNo ?? '',
        SR_METHOD_LABEL[r.returnMethod] ?? r.returnMethod,
        r.createdByName ?? '',
        r.itemCount ?? 0,
        r.totalAmount,
      ].join(','),
    );
    const csv = '﻿' + [header.join(','), ...lines].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = '銷退單列表.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const baseColumns: MasterTableColumn<Sr>[] = useMemo(
    () => [
      { key: 'docNo', label: '單號', sortable: true, render: (r) => <span className="font-mono">{r.docNo}</span> },
      {
        key: 'status',
        label: '狀態',
        render: (r) => <span className={`rounded px-2 py-0.5 text-[11px] ${STATUS_CLS[r.status] ?? 'bg-zinc-200 text-zinc-600'}`}>{SR_STATUS_LABEL[r.status] ?? r.status}</span>,
      },
      { key: 'createdAt', label: '建單日期', sortable: true, render: (r) => r.createdAt.slice(0, 10) },
      { key: 'srDate', label: '銷退日期', sortable: true, render: (r) => r.srDate.slice(0, 10) },
      { key: 'customerCode', label: '客戶編號', render: (r) => <span className="font-mono text-xs">{r.customerCode ?? '—'}</span> },
      { key: 'customerName', label: '客戶名稱', render: (r) => r.customerName ?? r.customerId },
      { key: 'soDocNo', label: '來源銷貨單', render: (r) => <span className="font-mono text-xs">{r.soDocNo ?? '—'}</span> },
      { key: 'returnMethod', label: '退款方式', render: (r) => SR_METHOD_LABEL[r.returnMethod] ?? r.returnMethod },
      { key: 'createdByName', label: '建單人員', render: (r) => r.createdByName ?? '—' },
      { key: 'itemCount', label: '項目數', render: (r) => <span className="tabular-nums">{r.itemCount ?? 0}</span> },
      { key: 'totalAmount', label: '退款總額', sortable: true, render: (r) => <span className="font-medium tabular-nums">{fmtMoney(r.totalAmount)}</span> },
    ],
    [],
  );

  const columns = useMemo(() => {
    if (!colOrder) return baseColumns;
    const map = new Map(baseColumns.map((c) => [c.key, c]));
    const ordered = colOrder.map((k) => map.get(k)).filter(Boolean) as MasterTableColumn<Sr>[];
    baseColumns.forEach((c) => {
      if (!colOrder.includes(c.key)) ordered.push(c);
    });
    return ordered;
  }, [colOrder, baseColumns]);

  const noop = () => {};

  return (
    <TieredFormProvider defaultMode="lite">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-foreground">
        <MasterPageHead
          tab={tab}
          onTabChange={(t) => {
            if (t === 'detail' && !selectedId) return;
            setTab(t);
          }}
          onCreate={startCreate}
        />

        {tab === 'list' ? (
          <>
            <ErpToolbar
              mode="browse"
              hasActiveRow={!!selectedId}
              selectionMode={false}
              onToggleSelection={noop}
              selectedCount={0}
              itemIndex={itemIndex}
              itemTotal={displayRows.length}
              onJumpFirstItem={() => selectAt(0)}
              onPrevItem={() => idx > 0 && selectAt(idx - 1)}
              onNextItem={() => idx >= 0 && idx < displayRows.length - 1 && selectAt(idx + 1)}
              onJumpLastItem={() => selectAt(displayRows.length - 1)}
              onCreate={startCreate}
              onEdit={openEdit}
              onSearch={() => setSearchOpen(true)}
              onDelete={handleCancel}
              onExport={handleExport}
              exportMenuOpen={exportMenuOpen}
              onExportMenuOpenChange={setExportMenuOpen}
              onPrint={() => alert('列印開發中')}
              onRefresh={() => void reload()}
              onSave={noop}
              onCancel={noop}
            />

            {activeCount > 0 ? (
              <div className="flex items-center gap-3 border-b border-border/40 bg-primary/5 px-4 py-2 text-xs">
                <span className="text-muted-foreground">查詢條件 {activeCount} 項 · 共 {total} 筆</span>
                <button onClick={() => setSearchOpen(true)} className="text-primary hover:underline">修改</button>
                <button onClick={() => setCriteria({})} className="text-muted-foreground hover:underline">清除</button>
              </div>
            ) : null}

            {error ? <div className="mx-3 mt-2 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div> : null}

            <div className="flex min-h-0 flex-1 flex-col">
              <MasterTable<Sr>
                columns={columns}
                rows={displayRows}
                getRowId={(r) => r.id}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onOpenDetail={openDetail}
                selectionMode={false}
                checked={new Set()}
                setChecked={noop}
                hideSerial
                pageSize={Math.max(displayRows.length, 1)}
                hidePageSizeArea
                sortKey={sortKey ?? undefined}
                onSortKeyChange={(k) => {
                  if (sortKey === k) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                  else {
                    setSortKey(k);
                    setSortOrder('asc');
                  }
                }}
                onColumnOrderChange={(next) => {
                  setColOrder(next);
                  saveJSON(COL_ORDER_KEY, next);
                }}
                columnWidths={colWidths}
                onColumnWidthChange={(key, w) => {
                  setColWidths((prev) => {
                    const next = { ...prev, [key]: w };
                    saveJSON(COL_WIDTH_KEY, next);
                    return next;
                  });
                }}
                totalCount={total}
              />
            </div>
          </>
        ) : creating ? (
          <SrCreatePanel
            onCreated={(id) => {
              void reload();
              openDetail(id, { editItems: true });
            }}
            onCancel={() => {
              setCreating(false);
              setTab('list');
            }}
          />
        ) : selectedId ? (
          <SrDetailPanel
            id={selectedId}
            initialMode={enterEditItems ? 'editItems' : enterEditHeader ? 'editHeader' : 'browse'}
            onChanged={reload}
            itemIndex={itemIndex}
            itemTotal={displayRows.length}
            onPrevItem={idx > 0 ? () => selectAt(idx - 1) : undefined}
            onNextItem={idx >= 0 && idx < displayRows.length - 1 ? () => selectAt(idx + 1) : undefined}
            onJumpFirst={() => selectAt(0)}
            onJumpLast={() => selectAt(displayRows.length - 1)}
            onCreate={startCreate}
            onSearch={() => setSearchOpen(true)}
          />
        ) : (
          <div className="p-6 text-sm text-muted-foreground">請先回資料瀏覽選一張銷退單。</div>
        )}

        {searchOpen ? (
          <SrSearchDialog
            initial={criteria}
            onApply={(c) => {
              setCriteria(c);
              setSearchOpen(false);
              setTab('list');
            }}
            onClose={() => setSearchOpen(false)}
          />
        ) : null}
      </div>
    </TieredFormProvider>
  );
}

function SearchRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5rem_1fr] items-center gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function SrSearchDialog({ initial, onApply, onClose }: { initial: SrCriteria; onApply: (c: SrCriteria) => void; onClose: () => void }) {
  const [status, setStatus] = useState(initial.status ?? '');
  const [search, setSearch] = useState(initial.search ?? '');
  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <form
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onApply({ status: status || undefined, search: search.trim() || undefined });
        }}
        className="relative w-full max-w-lg space-y-3 rounded-xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">查詢銷退單</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉"><X className="h-4 w-4" /></button>
        </div>
        <SearchRow label="單據狀態">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={cls}>
            <option value="">全部</option>
            {SR_STATUSES.map((s) => (
              <option key={s} value={s}>{SR_STATUS_LABEL[s as SrStatus]}</option>
            ))}
          </select>
        </SearchRow>
        <SearchRow label="關鍵字">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="單號 / 客戶 / 來源銷貨單號" className={cls} autoFocus />
        </SearchRow>
        <div className="flex justify-between pt-2">
          <button type="button" onClick={() => { setStatus(''); setSearch(''); }} className="rounded border px-4 py-1.5 text-sm">清除全部</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">取消</button>
            <button type="submit" className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground">查詢</button>
          </div>
        </div>
      </form>
    </div>
  );
}
