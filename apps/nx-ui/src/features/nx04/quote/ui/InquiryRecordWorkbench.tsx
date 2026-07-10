// apps/nx-ui/src/features/nx04/quote/ui/InquiryRecordWorkbench.tsx
// NX04-QT-SHELL 紀錄表 B2：詢價紀錄視圖（銷售作業 → 詢價紀錄）
//   讀詢價紀錄表 nx04_inquiry_record（調貨/同行側原子日誌）：料號/廠牌/量/同行報價/同行/日期/業務。
//   純紀錄 → 只讀（無新增/編輯/作廢）；工具列 = 導航 + 查詢 + 重整 + 匯出。餵調貨單拉入（B3）。

'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ErpToolbar, type ExportFormat } from '@/features/nx01/shell/ui/ErpToolbar';
import { MasterTable, type MasterTableColumn } from '@/features/nx01/shell/ui/MasterTable';

import { listInquiryRecords } from '@data/endpoints/nx04/record/api/record';
import type { InquiryRecord } from '@data/types/nx04/record';

const COL_ORDER_KEY = 'nx04.inquiryLog.list.colOrder';
const COL_WIDTH_KEY = 'nx04.inquiryLog.list.colWidths';
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
  recordDate: 110,
  partnerCode: 100,
  partnerName: 170,
  baseNo: 130,
  brandName: 110,
  partName: 200,
  qty: 80,
  unitPrice: 120,
  salesPersonName: 100,
  createdAt: 150,
};

const fmtNum = (n: string | number | null | undefined) =>
  n == null || n === '' ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

type RecordCriteria = {
  dateFrom?: string;
  dateTo?: string;
  partnerCode?: string;
  partnerName?: string;
  creator?: string;
  partNo?: string;
};
function countCriteria(c: RecordCriteria): number {
  return Object.values(c).filter((v) => v != null && String(v).trim() !== '').length;
}

const salesName = (r: InquiryRecord) => r.salesPersonName ?? r.createdByName ?? '—';

export function InquiryRecordWorkbench() {
  const [rows, setRows] = useState<InquiryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [criteria, setCriteria] = useState<RecordCriteria>({});
  const [sortKey, setSortKey] = useState<string | null>('recordDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [colOrder, setColOrder] = useState<string[] | null>(() => loadJSON<string[]>(COL_ORDER_KEY));
  const [colWidths, setColWidths] = useState<Record<string, number>>(
    () => loadJSON<Record<string, number>>(COL_WIDTH_KEY) ?? DEFAULT_WIDTHS,
  );

  const reload = useCallback(async () => {
    try {
      const resp = await listInquiryRecords({
        pageSize: 100,
        dateFrom: criteria.dateFrom || undefined,
        dateTo: criteria.dateTo || undefined,
        partnerCode: criteria.partnerCode?.trim() || undefined,
        partnerName: criteria.partnerName?.trim() || undefined,
        creator: criteria.creator?.trim() || undefined,
        partNo: criteria.partNo?.trim() || undefined,
      });
      setRows(resp.items);
      setTotal(resp.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '詢價紀錄載入失敗');
    }
  }, [criteria]);

  useEffect(() => {
    void reload();
  }, [reload]);

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
    let next: string | null | undefined;
    if (!displayRows.length) next = selectedId ? null : undefined;
    else if (!displayRows.some((r) => r.id === selectedId)) next = displayRows[0].id;
    if (next !== undefined) setSelectedId(next);
  }, [displayRows, selectedId]);

  const idx = selectedId ? displayRows.findIndex((r) => r.id === selectedId) : -1;
  const itemIndex = idx >= 0 ? idx + 1 : 0;
  const selectAt = (i: number) => {
    const r = displayRows[i];
    if (r) setSelectedId(r.id);
  };

  useEffect(() => {
    if (!selectedId) return;
    document.querySelector(`[data-row-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const inField = !!t && ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName);

      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const k = e.key.toLowerCase();
        const map: Record<string, () => void> = {
          f: () => setSearchOpen(true),
          r: () => void reload(),
          o: () => setExportMenuOpen(true),
        };
        const fn = searchOpen ? undefined : map[k];
        if (fn) {
          e.preventDefault();
          fn();
        }
        return;
      }

      if (searchOpen) return;
      if (e.ctrlKey || e.metaKey) return;
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
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen, displayRows, idx, selectedId]);

  const handleExport = (format: ExportFormat) => {
    if (format !== 'csv') {
      alert('PDF / 列印開發中');
      return;
    }
    const header = ['詢價日期', '同行編號', '同行名稱', '基準料號', '廠牌', '品名', '數量', '同行報價', '業務', '建單時間'];
    const lines = displayRows.map((r) =>
      [
        r.recordDate.slice(0, 10),
        r.partnerCode ?? '',
        r.partnerName ?? r.sourcePartnerId,
        r.baseNo ?? r.partNo ?? '',
        r.brandName ?? '',
        r.partName ?? '',
        r.qty ?? '',
        r.unitPrice ?? '',
        salesName(r),
        r.createdAt.slice(0, 19).replace('T', ' '),
      ].join(','),
    );
    const csv = '﻿' + [header.join(','), ...lines].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = '詢價紀錄.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const baseColumns: MasterTableColumn<InquiryRecord>[] = useMemo(
    () => [
      { key: 'recordDate', label: '詢價日期', sortable: true, render: (r) => r.recordDate.slice(0, 10) },
      { key: 'partnerCode', label: '同行編號', render: (r) => <span className="font-mono text-xs">{r.partnerCode ?? '—'}</span> },
      { key: 'partnerName', label: '同行名稱', render: (r) => r.partnerName ?? r.sourcePartnerId },
      { key: 'baseNo', label: '基準料號', render: (r) => <span className="font-mono text-xs">{r.baseNo ?? r.partNo ?? '—'}</span> },
      { key: 'brandName', label: '廠牌', render: (r) => r.brandName ?? '—' },
      { key: 'partName', label: '品名', render: (r) => r.partName ?? '—' },
      { key: 'qty', label: '數量', sortable: true, render: (r) => <span className="tabular-nums">{fmtNum(r.qty)}</span> },
      { key: 'unitPrice', label: '同行報價', sortable: true, render: (r) => <span className="font-medium tabular-nums">{fmtNum(r.unitPrice)}</span> },
      { key: 'salesPersonName', label: '業務', render: (r) => salesName(r) },
      { key: 'createdAt', label: '建單時間', sortable: true, render: (r) => <span className="text-xs text-muted-foreground">{r.createdAt.slice(0, 16).replace('T', ' ')}</span> },
    ],
    [],
  );

  const columns = useMemo(() => {
    if (!colOrder) return baseColumns;
    const map = new Map(baseColumns.map((c) => [c.key, c]));
    const ordered = colOrder.map((k) => map.get(k)).filter(Boolean) as MasterTableColumn<InquiryRecord>[];
    baseColumns.forEach((c) => {
      if (!colOrder.includes(c.key)) ordered.push(c);
    });
    return ordered;
  }, [colOrder, baseColumns]);

  const noop = () => {};

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-foreground">
      <ErpToolbar
        mode="browse"
        hideMutations
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
        onCreate={noop}
        onEdit={noop}
        onSearch={() => setSearchOpen(true)}
        onDelete={noop}
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
          <button onClick={() => setSearchOpen(true)} className="text-primary hover:underline">
            修改
          </button>
          <button onClick={() => setCriteria({})} className="text-muted-foreground hover:underline">
            清除
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="mx-3 mt-2 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        <MasterTable<InquiryRecord>
          columns={columns}
          rows={displayRows}
          getRowId={(r) => r.id}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onOpenDetail={noop}
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

      {searchOpen ? (
        <RecordSearchDialog
          initial={criteria}
          onApply={(c) => {
            setCriteria(c);
            setSearchOpen(false);
          }}
          onClose={() => setSearchOpen(false)}
        />
      ) : null}
    </div>
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

/** 查詢詢價紀錄（彈跳視窗、Enter 查詢）。區間只填「起」= 該日單一比對 */
function RecordSearchDialog({
  initial,
  onApply,
  onClose,
}: {
  initial: RecordCriteria;
  onApply: (c: RecordCriteria) => void;
  onClose: () => void;
}) {
  const [c, setC] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    Object.entries(initial).forEach(([k, v]) => {
      if (v != null) o[k] = String(v);
    });
    return o;
  });
  const set = (k: string, v: string) => setC((p) => ({ ...p, [k]: v }));
  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';

  function apply() {
    onApply({
      dateFrom: c.dateFrom,
      dateTo: c.dateTo,
      partnerCode: c.partnerCode,
      partnerName: c.partnerName,
      creator: c.creator,
      partNo: c.partNo,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <form
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
        className="relative w-full max-w-2xl space-y-3 rounded-xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">查詢詢價紀錄</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉">
            <X className="h-4 w-4" />
          </button>
        </div>

        <SearchRow label="詢價區間">
          <input type="date" value={c.dateFrom ?? ''} onChange={(e) => set('dateFrom', e.target.value)} className={cls} autoFocus />
          <span className="text-muted-foreground">~</span>
          <input type="date" value={c.dateTo ?? ''} onChange={(e) => set('dateTo', e.target.value)} className={cls} />
        </SearchRow>
        <SearchRow label="同行">
          <input value={c.partnerCode ?? ''} onChange={(e) => set('partnerCode', e.target.value)} placeholder="同行編號" className={cls} />
          <input value={c.partnerName ?? ''} onChange={(e) => set('partnerName', e.target.value)} placeholder="同行名稱" className={cls} />
        </SearchRow>
        <SearchRow label="業務">
          <input value={c.creator ?? ''} onChange={(e) => set('creator', e.target.value)} placeholder="員編 或 姓名" className={cls} />
        </SearchRow>
        <SearchRow label="零件料號">
          <input value={c.partNo ?? ''} onChange={(e) => set('partNo', e.target.value)} placeholder="料號" className={cls} />
        </SearchRow>

        <div className="flex justify-between pt-2">
          <button type="button" onClick={() => setC({})} className="rounded border px-4 py-1.5 text-sm">
            清除全部
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">
              取消
            </button>
            <button type="submit" className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground">
              查詢
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
