// apps/nx-ui/src/features/nx04/quote/ui/QuoteRecordWorkbench.tsx
// NX04-QT-SHELL Step5C-2(a)：報價紀錄視圖（銷售作業 → 報價紀錄）
//   即時報價（source=INSTANT）的原子日誌瀏覽頁：料號/廠牌/量/價/客戶/日期/業務。
//   純紀錄 → 只讀（無新增/編輯/作廢）；工具列 = 導航 + 查詢 + 重整 + 匯出。
//   單行紀錄直接攤 firstItem（後端 list 帶回首筆明細快照），不必進詳情。

'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ErpToolbar, type ExportFormat } from '@/features/nx01/shell/ui/ErpToolbar';
import { MasterTable, type MasterTableColumn } from '@/features/nx01/shell/ui/MasterTable';

import { listQuote } from '@data/endpoints/nx04/quote/api/quote';
import type { Quote } from '@data/types/nx04/quote';

// ── 欄位順序 / 寬度 記憶（localStorage、與報價單列表分開 key）──
const COL_ORDER_KEY = 'nx04.quoteLog.list.colOrder';
const COL_WIDTH_KEY = 'nx04.quoteLog.list.colWidths';
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
  quoteDate: 110,
  customerCode: 100,
  customerName: 170,
  baseNo: 130,
  brandName: 110,
  partName: 200,
  qty: 80,
  unitPrice: 110,
  createdByName: 100,
  docNo: 150,
  createdAt: 150,
};

// 金額 / 數量 千分位（顯示用；CSV 匯出仍用原始值避免逗號破欄）
const fmtNum = (n: string | number | null | undefined) =>
  n == null || n === '' ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

type RecordCriteria = {
  createdFrom?: string;
  createdTo?: string;
  quoteFrom?: string;
  quoteTo?: string;
  customerCode?: string;
  customerName?: string;
  creator?: string;
  partNo?: string;
};
function countCriteria(c: RecordCriteria): number {
  return Object.values(c).filter((v) => v != null && String(v).trim() !== '').length;
}

export function QuoteRecordWorkbench() {
  const [rows, setRows] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [criteria, setCriteria] = useState<RecordCriteria>({});
  const [sortKey, setSortKey] = useState<string | null>('quoteDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [colOrder, setColOrder] = useState<string[] | null>(() => loadJSON<string[]>(COL_ORDER_KEY));
  const [colWidths, setColWidths] = useState<Record<string, number>>(
    () => loadJSON<Record<string, number>>(COL_WIDTH_KEY) ?? DEFAULT_WIDTHS,
  );

  const reload = useCallback(async () => {
    try {
      const resp = await listQuote({
        pageSize: 200,
        source: 'INSTANT', // 只看即時報價紀錄
        createdFrom: criteria.createdFrom || undefined,
        createdTo: criteria.createdTo || undefined,
        quoteFrom: criteria.quoteFrom || undefined,
        quoteTo: criteria.quoteTo || undefined,
        customerCode: criteria.customerCode?.trim() || undefined,
        customerName: criteria.customerName?.trim() || undefined,
        creator: criteria.creator?.trim() || undefined,
        partNo: criteria.partNo?.trim() || undefined,
      });
      setRows(resp.items);
      setTotal(resp.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '報價紀錄載入失敗');
    }
  }, [criteria]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // 排序（篩選走伺服器端：查詢彈窗）
  const displayRows = useMemo(() => {
    if (!sortKey) return rows;
    const dir = sortOrder === 'asc' ? 1 : -1;
    const pick = (r: Quote): unknown => {
      if (sortKey in (r.firstItem ?? {})) return (r.firstItem as unknown as Record<string, unknown>)[sortKey];
      return (r as unknown as Record<string, unknown>)[sortKey];
    };
    return [...rows].sort((a, b) => {
      const av = pick(a);
      const bv = pick(b);
      const an = Number(av);
      const bn = Number(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return (an - bn) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }, [rows, sortKey, sortOrder]);
  const activeCount = countCriteria(criteria);

  // 預設永遠選一筆（第一筆）
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

  // 選中列捲入可視
  useEffect(() => {
    if (!selectedId) return;
    document.querySelector(`[data-row-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  // 全鍵盤：↑↓/Home/End 控列 + Alt 工具列快捷
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
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // selectAt/reload 為依當前 render 的閉包；以 disable 略過 deps 檢查
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen, displayRows, idx, selectedId]);

  const handleExport = (format: ExportFormat) => {
    if (format !== 'csv') {
      alert('PDF / 列印開發中');
      return;
    }
    const header = ['報價日期', '客戶編號', '客戶名稱', '基準料號', '廠牌', '品名', '數量', '單價', '業務', '單號', '建單時間'];
    const lines = displayRows.map((r) => {
      const fi = r.firstItem;
      return [
        r.quoteDate.slice(0, 10),
        r.customerCode ?? '',
        r.customerName ?? r.customerId,
        fi?.baseNo ?? fi?.partNo ?? '',
        fi?.brandName ?? '',
        fi?.partName ?? '',
        fi?.qty ?? '',
        fi?.unitPrice ?? '',
        r.createdByName ?? '',
        r.docNo,
        r.createdAt.slice(0, 19).replace('T', ' '),
      ].join(',');
    });
    const csv = '﻿' + [header.join(','), ...lines].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = '報價紀錄.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const baseColumns: MasterTableColumn<Quote>[] = useMemo(
    () => [
      { key: 'quoteDate', label: '報價日期', sortable: true, render: (r) => r.quoteDate.slice(0, 10) },
      { key: 'customerCode', label: '客戶編號', render: (r) => <span className="font-mono text-xs">{r.customerCode ?? '—'}</span> },
      { key: 'customerName', label: '客戶名稱', render: (r) => r.customerName ?? r.customerId },
      { key: 'baseNo', label: '基準料號', render: (r) => <span className="font-mono text-xs">{r.firstItem?.baseNo ?? r.firstItem?.partNo ?? '—'}</span> },
      { key: 'brandName', label: '廠牌', render: (r) => r.firstItem?.brandName ?? '—' },
      { key: 'partName', label: '品名', render: (r) => r.firstItem?.partName ?? '—' },
      { key: 'qty', label: '數量', sortable: true, render: (r) => <span className="tabular-nums">{fmtNum(r.firstItem?.qty)}</span> },
      { key: 'unitPrice', label: '單價', sortable: true, render: (r) => <span className="font-medium tabular-nums">{fmtNum(r.firstItem?.unitPrice)}</span> },
      { key: 'createdByName', label: '業務', render: (r) => r.createdByName ?? '—' },
      { key: 'docNo', label: '單號', sortable: true, render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.docNo}</span> },
      { key: 'createdAt', label: '建單時間', sortable: true, render: (r) => <span className="text-xs text-muted-foreground">{r.createdAt.slice(0, 16).replace('T', ' ')}</span> },
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
        <MasterTable<Quote>
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

/** 查詢報價紀錄（彈跳視窗、Enter 查詢）。區間只填「起」= 該日單一比對 */
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
      createdFrom: c.createdFrom,
      createdTo: c.createdTo,
      quoteFrom: c.quoteFrom,
      quoteTo: c.quoteTo,
      customerCode: c.customerCode,
      customerName: c.customerName,
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
          <h2 className="text-sm font-semibold">查詢報價紀錄</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉">
            <X className="h-4 w-4" />
          </button>
        </div>

        <SearchRow label="報價區間">
          <input type="date" value={c.quoteFrom ?? ''} onChange={(e) => set('quoteFrom', e.target.value)} className={cls} autoFocus />
          <span className="text-muted-foreground">~</span>
          <input type="date" value={c.quoteTo ?? ''} onChange={(e) => set('quoteTo', e.target.value)} className={cls} />
        </SearchRow>
        <SearchRow label="建單區間">
          <input type="date" value={c.createdFrom ?? ''} onChange={(e) => set('createdFrom', e.target.value)} className={cls} />
          <span className="text-muted-foreground">~</span>
          <input type="date" value={c.createdTo ?? ''} onChange={(e) => set('createdTo', e.target.value)} className={cls} />
        </SearchRow>
        <SearchRow label="客戶">
          <input value={c.customerCode ?? ''} onChange={(e) => set('customerCode', e.target.value)} placeholder="客戶編號" className={cls} />
          <input value={c.customerName ?? ''} onChange={(e) => set('customerName', e.target.value)} placeholder="客戶名稱" className={cls} />
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
