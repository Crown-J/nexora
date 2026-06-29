// apps/nx-ui/src/features/nx04/quote/ui/QuoteWorkbench.tsx
// NX04-QT-SHELL：報價單工作區（六層完整、比照主檔 EntityMasterPage 範式）
//   L4 資料瀏覽/詳細 同頁分頁；資料瀏覽用 MasterTable（邊到邊/預設選第一筆/↑↓Enter 全鍵盤）
//   L3 完整 ErpToolbar（瀏覽：上下筆 nav + 新增/編輯/作廢 + 查詢/排序/重整 + 列印/匯出）
//   狀態/搜尋收進工具列「查詢」面板，主內容層只剩表格；欄位顯名稱不露內碼

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { MasterPageHead } from '@/features/nx01/shell/master-nav';
import { ErpToolbar, type ExportFormat } from '@/features/nx01/shell/ui/ErpToolbar';
import { MasterTable, type MasterTableColumn } from '@/features/nx01/shell/ui/MasterTable';
import type { MasterTab } from '@/features/nx01/shell/entity-master/MasterTabs';
import type { SortableOption } from '@/features/nx01/shell/ui/sort-config/SortMenuButton';
import { TieredFormProvider } from '@/features/shared/tiered-form/TieredFormProvider';

import { createQuote, listQuote, voidQuote } from '@data/endpoints/nx04/quote/api/quote';
import type { CreateQuotePayload, Quote, QuoteStatus } from '@data/types/nx04/quote';
import { QUOTE_STATUSES, QUOTE_STATUS_LABEL } from '@data/types/nx04/quote';

import { QuoteDetailPanel } from './QuoteDetailView';

const STATUS_BADGE_CLASS: Record<string, string> = {
  DRAFT: 'bg-muted text-foreground',
  SENT: 'bg-amber-100 text-amber-900',
  ACCEPTED: 'bg-emerald-100 text-emerald-900',
  REJECTED: 'bg-rose-100 text-rose-900',
  EXPIRED: 'bg-zinc-200 text-zinc-700',
  CANCELLED: 'bg-zinc-100 text-zinc-500 line-through',
};

const STATUS_OPTIONS: { value: QuoteStatus | ''; label: string }[] = [
  { value: '', label: '全部狀態' },
  ...QUOTE_STATUSES.map((s) => ({ value: s, label: QUOTE_STATUS_LABEL[s] })),
];

const SORT_OPTIONS: SortableOption[] = [
  { key: 'docNo', label: '單號' },
  { key: 'quoteDate', label: '報價日' },
  { key: 'validUntil', label: '有效期限' },
  { key: 'totalAmount', label: '含稅總額' },
  { key: 'status', label: '狀態' },
];

function isExpired(validUntil: string | null): boolean {
  if (!validUntil) return false;
  return new Date(validUntil) < new Date(new Date().toDateString());
}

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
  const [status, setStatus] = useState<QuoteStatus | ''>('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>('quoteDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const resp = await listQuote({
        status: status || undefined,
        search: search.trim() || undefined,
        pageSize: 100,
      });
      setRows(resp.items);
      setTotal(resp.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '列表載入失敗');
    }
  }, [status, search]);

  useEffect(() => {
    // 資料載入：fetch→setState 於 await 後，屬同步外部系統的合法 effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  // 客戶端排序
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

  // 預設永遠選一筆（第一筆）→ 支援全鍵盤
  useEffect(() => {
    if (tab !== 'list') return;
    let next: string | null | undefined;
    if (!displayRows.length) next = selectedId ? null : undefined;
    else if (!displayRows.some((r) => r.id === selectedId)) next = displayRows[0].id;
    if (next !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(next);
    }
  }, [displayRows, tab, selectedId]);

  const idx = selectedId ? displayRows.findIndex((r) => r.id === selectedId) : -1;
  const itemIndex = idx >= 0 ? idx + 1 : 0;
  const selectAt = (i: number) => {
    const r = displayRows[i];
    if (r) setSelectedId(r.id);
  };
  const selected = idx >= 0 ? displayRows[idx] : null;

  const openDetail = (id: string) => {
    setSelectedId(id);
    setTab('detail');
  };

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
    const header = ['單號', '狀態', '報價日', '有效期限', '客戶', '業務員', '未稅', '含稅', '備註'];
    const lines = displayRows.map((r) =>
      [
        r.docNo,
        QUOTE_STATUS_LABEL[r.status] ?? r.status,
        r.quoteDate.slice(0, 10),
        r.validUntil?.slice(0, 10) ?? '',
        r.customerName ?? r.customerId,
        r.salesPersonName ?? '',
        r.subtotal,
        r.totalAmount,
        (r.remark ?? '').replace(/[\r\n,]/g, ' '),
      ].join(','),
    );
    const csv = '﻿' + [header.join(','), ...lines].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `報價單列表.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: MasterTableColumn<Quote>[] = useMemo(
    () => [
      { key: 'docNo', label: '單號', minWidthClass: 'min-w-[150px]', render: (r) => <span className="font-mono">{r.docNo}</span> },
      {
        key: 'status',
        label: '狀態',
        render: (r) => (
          <span className={`rounded px-2 py-0.5 text-[11px] ${STATUS_BADGE_CLASS[r.status] ?? 'bg-muted'}`}>
            {QUOTE_STATUS_LABEL[r.status] ?? r.status}
          </span>
        ),
      },
      { key: 'quoteDate', label: '報價日', render: (r) => r.quoteDate.slice(0, 10) },
      {
        key: 'validUntil',
        label: '有效期限',
        render: (r) => {
          const exp = isExpired(r.validUntil);
          return (
            <span className={exp ? 'font-semibold text-rose-600' : ''}>
              {r.validUntil ? r.validUntil.slice(0, 10) : '—'}
              {exp ? '（過期）' : ''}
            </span>
          );
        },
      },
      { key: 'customerName', label: '客戶', minWidthClass: 'min-w-[160px]', render: (r) => r.customerName ?? r.customerId },
      { key: 'salesPersonName', label: '業務員', render: (r) => r.salesPersonName ?? '—' },
      { key: 'subtotal', label: '未稅', render: (r) => <span className="tabular-nums">{r.subtotal}</span> },
      { key: 'totalAmount', label: '含稅', render: (r) => <span className="tabular-nums font-medium">{r.totalAmount}</span> },
      { key: 'remark', label: '備註', minWidthClass: 'min-w-[120px]', render: (r) => <span className="text-muted-foreground">{r.remark ?? ''}</span> },
    ],
    [],
  );

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
                setSortKey('quoteDate');
                setSortOrder('desc');
              }}
              sortMenuOpen={sortMenuOpen}
              onSortMenuOpenChange={setSortMenuOpen}
              onSave={noop}
              onCancel={noop}
              onOpenFilter={() => setFilterOpen((o) => !o)}
              filterCount={(status ? 1 : 0) + (search.trim() ? 1 : 0)}
            />

            {filterOpen ? (
              <QuoteFilterPanel
                status={status}
                search={search}
                onApply={(st, kw) => {
                  setStatus(st);
                  setSearch(kw);
                }}
                onClose={() => setFilterOpen(false)}
              />
            ) : null}

            {error ? (
              <div className="mx-3 mt-2 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
            ) : null}

            {showNew ? (
              <div className="border-b border-border/40 p-3">
                <QuickCreateForm
                  onCreated={(id) => {
                    setShowNew(false);
                    void reload();
                    openDetail(id);
                  }}
                  onCancel={() => setShowNew(false)}
                />
              </div>
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
                pageSize={100}
                hidePageSizeArea
                sortKey={sortKey ?? undefined}
                onSortKeyChange={(k) => {
                  if (sortKey === k) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                  else {
                    setSortKey(k);
                    setSortOrder('asc');
                  }
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
      </div>
    </TieredFormProvider>
  );
}

/** 查詢 / 篩選面板（工具列「查詢」展開；主內容層維持純表格）*/
function QuoteFilterPanel({
  status,
  search,
  onApply,
  onClose,
}: {
  status: QuoteStatus | '';
  search: string;
  onApply: (status: QuoteStatus | '', search: string) => void;
  onClose: () => void;
}) {
  const [st, setSt] = useState<QuoteStatus | ''>(status);
  const [kw, setKw] = useState(search);
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-border/40 bg-muted/20 px-4 py-3">
      <label className="text-sm">
        <span className="mb-1 block text-xs text-muted-foreground">狀態</span>
        <select value={st} onChange={(e) => setSt(e.target.value as QuoteStatus | '')} className="rounded border bg-background px-2 py-1 text-sm">
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-[16rem] flex-1 text-sm">
        <span className="mb-1 block text-xs text-muted-foreground">關鍵字（單號 / 客戶 / 料件）</span>
        <input
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onApply(st, kw)}
          placeholder="輸入後按套用 / Enter"
          className="w-full rounded border bg-background px-2 py-1 text-sm"
          autoFocus
        />
      </label>
      <button onClick={() => onApply(st, kw)} className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground">
        套用
      </button>
      <button
        onClick={() => {
          setSt('');
          setKw('');
          onApply('', '');
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

function QuickCreateForm({
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
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <h2 className="text-sm font-semibold">新增報價單（建立後進入詳情頁加料件；客戶/倉庫 picker 待 Step4）</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">倉庫 ID *</span>
          <input value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} placeholder="NX01WARE..." className={cls} required />
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
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
          {busy ? '建立中…' : '建立並進入'}
        </button>
        <button type="button" onClick={onCancel} className="rounded border px-4 py-1.5 text-sm">
          取消
        </button>
      </div>
    </form>
  );
}
