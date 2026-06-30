// apps/nx-ui/src/features/nx04/quote/ui/QuoteWorkbench.tsx
// NX04-QT-SHELL：報價單工作區（六層完整、比照主檔 EntityMasterPage 範式）
//   L4 資料瀏覽/詳細 同頁分頁；資料瀏覽用 MasterTable（邊到邊 + Excel 式拉寬 + 拖拉排序記憶）
//   全鍵盤：↑↓/Home/End/Enter 永遠控制主內容層（不靠 DOM 焦點、彈窗開啟時讓位）；Alt+1/2 切分頁
//   狀態收斂為 有效/失效；單號預設大到小

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { MasterPageHead } from '@/features/nx01/shell/master-nav';
import { ErpToolbar, type ExportFormat } from '@/features/nx01/shell/ui/ErpToolbar';
import { MasterTable, type MasterTableColumn } from '@/features/nx01/shell/ui/MasterTable';
import type { MasterTab } from '@/features/nx01/shell/entity-master/MasterTabs';
import type { SortableOption } from '@/features/nx01/shell/ui/sort-config/SortMenuButton';
import { TieredFormProvider } from '@/features/shared/tiered-form/TieredFormProvider';

import { createQuote, listQuote, voidQuote } from '@data/endpoints/nx04/quote/api/quote';
import type { CreateQuotePayload, Quote } from '@data/types/nx04/quote';

import { QuoteDetailPanel } from './QuoteDetailView';

// ── 欄位順序 / 寬度 記憶（localStorage）──
const COL_ORDER_KEY = 'nx04.quote.list.colOrder';
const COL_WIDTH_KEY = 'nx04.quote.list.colWidths';
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
  docNo: 160,
  valid: 80,
  createdAt: 110,
  quoteDate: 110,
  customerCode: 110,
  customerName: 190,
  createdByName: 100,
  itemCount: 80,
  subtotal: 110,
  totalAmount: 120,
  validUntil: 120,
};

const SORT_OPTIONS: SortableOption[] = [
  { key: 'docNo', label: '單號' },
  { key: 'createdAt', label: '建單日期' },
  { key: 'quoteDate', label: '報價日期' },
  { key: 'totalAmount', label: '總金額' },
];

// 列表狀態：純看有效期（作廢 / 失效(逾期) / 有效）；不碰接受·拒絕（成交與否走銷貨單拉報價）
type ListStatus = 'valid' | 'expired' | 'void';
function listStatus(q: Quote): ListStatus {
  if (q.voidedAt) return 'void';
  if (q.validUntil && new Date(q.validUntil) < new Date(new Date().toDateString())) return 'expired';
  return 'valid';
}
const LIST_STATUS_LABEL: Record<ListStatus, string> = { valid: '有效', expired: '失效', void: '作廢' };

export function QuoteWorkbench({
  initialId,
  initialTab = 'list',
}: {
  initialId?: string;
  initialTab?: MasterTab;
}) {
  const [tab, setTab] = useState<MasterTab>(initialId ? 'detail' : initialTab);
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);
  const [rows, setRows] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [validFilter, setValidFilter] = useState<'all' | ListStatus>('all');
  const [showNew, setShowNew] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>('docNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [colOrder, setColOrder] = useState<string[] | null>(() => loadJSON<string[]>(COL_ORDER_KEY));
  const [colWidths, setColWidths] = useState<Record<string, number>>(
    () => loadJSON<Record<string, number>>(COL_WIDTH_KEY) ?? DEFAULT_WIDTHS,
  );

  const reload = useCallback(async () => {
    try {
      const resp = await listQuote({ search: search.trim() || undefined, pageSize: 200 });
      setRows(resp.items);
      setTotal(resp.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '列表載入失敗');
    }
  }, [search]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // 篩選（有效/失效）+ 排序
  const displayRows = useMemo(() => {
    let r = rows;
    if (validFilter !== 'all') r = r.filter((q) => listStatus(q) === validFilter);
    if (!sortKey) return r;
    const dir = sortOrder === 'asc' ? 1 : -1;
    return [...r].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const an = Number(av);
      const bn = Number(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return (an - bn) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }, [rows, validFilter, sortKey, sortOrder]);

  // 預設永遠選一筆（第一筆）
  useEffect(() => {
    if (tab !== 'list') return;
    let next: string | null | undefined;
    if (!displayRows.length) next = selectedId ? null : undefined;
    else if (!displayRows.some((r) => r.id === selectedId)) next = displayRows[0].id;
    if (next !== undefined) {
      setSelectedId(next);
    }
  }, [displayRows, tab, selectedId]);

  const idx = selectedId ? displayRows.findIndex((r) => r.id === selectedId) : -1;
  const itemIndex = idx >= 0 ? idx + 1 : 0;
  const selected = idx >= 0 ? displayRows[idx] : null;
  const selectAt = (i: number) => {
    const r = displayRows[i];
    if (r) setSelectedId(r.id);
  };
  const openDetail = (id: string) => {
    setSelectedId(id);
    setTab('detail');
  };

  // 選中列捲入可視
  useEffect(() => {
    if (tab !== 'list' || !selectedId) return;
    document.querySelector(`[data-row-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId, tab]);

  // 全鍵盤：永遠控制主內容層（不靠焦點）；彈窗 / 輸入框 / 列焦點時讓位
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const inField = !!t && ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName);
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setTab('list');
        return;
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        if (selectedId) setTab('detail');
        return;
      }
      if (showNew) return; // 彈窗優先
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (tab === 'list') {
        if (inField) return;
        const active = document.activeElement as HTMLElement | null;
        if (active?.hasAttribute?.('data-row-id')) return; // 焦點在列、交給 MasterTable
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
      } else if (tab === 'detail' && !inField) {
        if (e.key === 'ArrowUp' && idx > 0) {
          e.preventDefault();
          selectAt(idx - 1);
        } else if (e.key === 'ArrowDown' && idx >= 0 && idx < displayRows.length - 1) {
          e.preventDefault();
          selectAt(idx + 1);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // selectAt/openDetail 為依 displayRows 的閉包、已在 deps；不重複列
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, showNew, displayRows, idx, selectedId]);

  const handleVoid = () => {
    if (!selected) return;
    if (selected.status !== 'DRAFT' && selected.status !== 'SENT') {
      alert('此狀態不可作廢（僅草稿 / 已寄出可作廢）');
      return;
    }
    const reason = window.prompt(`作廢報價單 ${selected.docNo}？請輸入原因（必填）`);
    if (!reason?.trim()) return;
    void (async () => {
      try {
        await voidQuote(selected.id, reason.trim());
        await reload();
      } catch (e) {
        alert(e instanceof Error ? e.message : '作廢失敗');
      }
    })();
  };

  const handleExport = (format: ExportFormat) => {
    if (format !== 'csv') {
      alert('PDF / 列印開發中');
      return;
    }
    const header = ['單號', '狀態', '建單日期', '報價日期', '客戶編號', '客戶名稱', '建單人員', '項目數', '未稅', '總金額', '有效日期'];
    const lines = displayRows.map((r) =>
      [
        r.docNo,
        LIST_STATUS_LABEL[listStatus(r)],
        r.createdAt.slice(0, 10),
        r.quoteDate.slice(0, 10),
        r.customerCode ?? '',
        r.customerName ?? r.customerId,
        r.createdByName ?? '',
        r.itemCount ?? 0,
        r.subtotal,
        r.totalAmount,
        r.validUntil?.slice(0, 10) ?? '',
      ].join(','),
    );
    const csv = '﻿' + [header.join(','), ...lines].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = '報價單列表.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const baseColumns: MasterTableColumn<Quote>[] = useMemo(
    () => [
      { key: 'docNo', label: '單號', sortable: true, render: (r) => <span className="font-mono">{r.docNo}</span> },
      {
        key: 'valid',
        label: '狀態',
        render: (r) => {
          const s = listStatus(r);
          const cls =
            s === 'valid'
              ? 'bg-emerald-100 text-emerald-800'
              : s === 'void'
                ? 'bg-rose-100 text-rose-700'
                : 'bg-zinc-200 text-zinc-600';
          return <span className={`rounded px-2 py-0.5 text-[11px] ${cls}`}>{LIST_STATUS_LABEL[s]}</span>;
        },
      },
      { key: 'createdAt', label: '建單日期', sortable: true, render: (r) => r.createdAt.slice(0, 10) },
      { key: 'quoteDate', label: '報價日期', sortable: true, render: (r) => r.quoteDate.slice(0, 10) },
      { key: 'customerCode', label: '客戶編號', render: (r) => <span className="font-mono text-xs">{r.customerCode ?? '—'}</span> },
      { key: 'customerName', label: '客戶名稱', render: (r) => r.customerName ?? r.customerId },
      { key: 'createdByName', label: '建單人員', render: (r) => r.createdByName ?? '—' },
      { key: 'itemCount', label: '項目數', render: (r) => <span className="tabular-nums">{r.itemCount ?? 0}</span> },
      { key: 'subtotal', label: '未稅金額', render: (r) => <span className="tabular-nums">{r.subtotal}</span> },
      { key: 'totalAmount', label: '總金額', sortable: true, render: (r) => <span className="font-medium tabular-nums">{r.totalAmount}</span> },
      {
        key: 'validUntil',
        label: '有效日期',
        render: (r) => {
          const exp = r.validUntil && new Date(r.validUntil) < new Date(new Date().toDateString());
          return <span className={exp ? 'font-semibold text-rose-600' : ''}>{r.validUntil ? r.validUntil.slice(0, 10) : '—'}</span>;
        },
      },
    ],
    [],
  );

  // 套用記憶的欄位順序
  const columns = useMemo(() => {
    if (!colOrder) return baseColumns;
    const map = new Map(baseColumns.map((c) => [c.key, c]));
    const ordered = colOrder.map((k) => map.get(k)).filter(Boolean) as MasterTableColumn<Quote>[];
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
          detailTitle={selected?.docNo}
          detailSubtitle={tab === 'detail' ? '詳細資料' : '瀏覽'}
          onCreate={() => setShowNew(true)}
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
              onCreate={() => setShowNew(true)}
              onEdit={() => selectedId && setTab('detail')}
              onSearch={() => setFilterOpen((o) => !o)}
              onDelete={handleVoid}
              onExport={handleExport}
              exportMenuOpen={exportMenuOpen}
              onExportMenuOpenChange={setExportMenuOpen}
              onPrint={() => alert('列印開發中')}
              onRefresh={() => void reload()}
              sortOptions={SORT_OPTIONS}
              sortKey={sortKey}
              sortOrder={sortOrder}
              onSortChange={(k, o) => {
                setSortKey(k);
                setSortOrder(o);
              }}
              onSortReset={() => {
                setSortKey('docNo');
                setSortOrder('desc');
              }}
              sortMenuOpen={sortMenuOpen}
              onSortMenuOpenChange={setSortMenuOpen}
              onSave={noop}
              onCancel={noop}
              onOpenFilter={() => setFilterOpen((o) => !o)}
              filterCount={(validFilter !== 'all' ? 1 : 0) + (search.trim() ? 1 : 0)}
            />

            {filterOpen ? (
              <QuoteFilterPanel
                validFilter={validFilter}
                search={search}
                onApply={(vf, kw) => {
                  setValidFilter(vf);
                  setSearch(kw);
                }}
                onClose={() => setFilterOpen(false)}
              />
            ) : null}

            {error ? (
              <div className="mx-3 mt-2 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
            ) : null}

            <div className="flex min-h-0 flex-1 flex-col">
              <MasterTable<Quote>
                columns={columns}
                rows={displayRows}
                getRowId={(r) => r.id}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onOpenDetail={openDetail}
                selectionMode={false}
                checked={new Set()}
                setChecked={noop}
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
        ) : selectedId ? (
          <QuoteDetailPanel
            id={selectedId}
            onBack={() => setTab('list')}
            onChanged={reload}
            itemIndex={itemIndex}
            itemTotal={displayRows.length}
            onPrevItem={idx > 0 ? () => selectAt(idx - 1) : undefined}
            onNextItem={idx >= 0 && idx < displayRows.length - 1 ? () => selectAt(idx + 1) : undefined}
          />
        ) : (
          <div className="p-6 text-sm text-muted-foreground">請先回資料瀏覽選一張報價單。</div>
        )}

        {showNew ? (
          <QuickCreateDialog
            onCreated={(id) => {
              setShowNew(false);
              void reload();
              openDetail(id);
            }}
            onCancel={() => setShowNew(false)}
          />
        ) : null}
      </div>
    </TieredFormProvider>
  );
}

/** 查詢 / 篩選面板（工具列「查詢」展開；主內容層維持純表格）*/
function QuoteFilterPanel({
  validFilter,
  search,
  onApply,
  onClose,
}: {
  validFilter: 'all' | ListStatus;
  search: string;
  onApply: (validFilter: 'all' | ListStatus, search: string) => void;
  onClose: () => void;
}) {
  const [vf, setVf] = useState(validFilter);
  const [kw, setKw] = useState(search);
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-border/40 bg-muted/20 px-4 py-3">
      <label className="text-sm">
        <span className="mb-1 block text-xs text-muted-foreground">狀態</span>
        <select value={vf} onChange={(e) => setVf(e.target.value as 'all' | ListStatus)} className="rounded border bg-background px-2 py-1 text-sm">
          <option value="all">全部</option>
          <option value="valid">有效</option>
          <option value="expired">失效</option>
          <option value="void">作廢</option>
        </select>
      </label>
      <label className="min-w-[16rem] flex-1 text-sm">
        <span className="mb-1 block text-xs text-muted-foreground">關鍵字（單號 / 客戶 / 料件）</span>
        <input
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onApply(vf, kw)}
          placeholder="輸入後按套用 / Enter"
          className="w-full rounded border bg-background px-2 py-1 text-sm"
          autoFocus
        />
      </label>
      <button onClick={() => onApply(vf, kw)} className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground">
        套用
      </button>
      <button
        onClick={() => {
          setVf('all');
          setKw('');
          onApply('all', '');
        }}
        className="rounded border px-3 py-1.5 text-sm"
      >
        清除
      </button>
      <button onClick={onClose} className="rounded border px-3 py-1.5 text-sm">
        收合
      </button>
    </div>
  );
}

/** 新增報價單（彈跳視窗、彈窗優先）*/
function QuickCreateDialog({
  onCreated,
  onCancel,
}: {
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const [warehouseId, setWarehouseId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerGradeId, setCustomerGradeId] = useState('');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState('');
  const [taxRate, setTaxRate] = useState('5');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!warehouseId.trim() || !customerId.trim()) {
      setErr('倉庫 / 客戶必填');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload: CreateQuotePayload = {
        warehouseId: warehouseId.trim(),
        customerId: customerId.trim(),
        customerGradeId: customerGradeId.trim() || undefined,
        quoteDate,
        validUntil: validUntil || undefined,
        taxRate: Number(taxRate) || 0,
        remark: remark.trim() || undefined,
      };
      const q = await createQuote(payload);
      onCreated(q.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setBusy(false);
    }
  }

  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40" />
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-2xl space-y-3 rounded-xl border border-border bg-card p-5 shadow-2xl">
        <h2 className="text-sm font-semibold">新增報價單（建立後進入詳情頁加料件；客戶/倉庫 picker 待 Step4）</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">倉庫 ID *</span>
            <input value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} placeholder="NX01WARE..." className={cls} required autoFocus />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">客戶 ID *</span>
            <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="NX01PTNR..." className={cls} required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">客戶等級 ID</span>
            <input value={customerGradeId} onChange={(e) => setCustomerGradeId(e.target.value)} placeholder="NX01CUGR..." className={cls} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">報價日 *</span>
            <input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className={cls} required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">有效期限（留白自動帶預設天數）</span>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={cls} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">稅率 % *</span>
            <input type="number" step="0.01" min="0" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className={`${cls} tabular-nums`} required />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-xs text-muted-foreground">備註</span>
            <input value={remark} onChange={(e) => setRemark(e.target.value)} className={cls} />
          </label>
        </div>
        {err ? <div className="text-xs text-destructive">{err}</div> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded border px-4 py-1.5 text-sm">
            取消
          </button>
          <button type="submit" disabled={busy} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
            {busy ? '建立中…' : '建立並進入'}
          </button>
        </div>
      </form>
    </div>
  );
}
