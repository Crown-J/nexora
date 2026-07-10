// apps/nx-ui/src/features/shared/doc-shell/DocWorkbench.tsx
// NX02-RR-SHELL：單據工作區泛型外殼（第四張單時抽象、執行長範式）
//   從 Quote/So/Sr/St 四份 Workbench 複製體收斂：共用骨架進本檔、差異點全走 config 注入
//   L4 資料瀏覽/詳細 同頁分頁；瀏覽用 MasterTable（邊到邊 + Excel 式拉寬 + 拖拉排序記憶）
//   全鍵盤：↑↓/Home/End/Enter 控主內容層（不靠 DOM 焦點、彈窗讓位）；Alt+1/2 切分頁 + Alt 字母快捷
'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';

import { MasterPageHead } from '@/features/nx01/shell/master-nav';
import { ErpToolbar, type ExportFormat } from '@/features/nx01/shell/ui/ErpToolbar';
import { MasterTable, type MasterTableColumn } from '@/features/nx01/shell/ui/MasterTable';
import type { MasterTab } from '@/features/nx01/shell/entity-master/MasterTabs';
import { TieredFormProvider } from '@/features/shared/tiered-form/TieredFormProvider';

// ── localStorage 記憶（欄序 / 欄寬）──
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

/** 金額千分位（列表顯示用；CSV 匯出仍用原始值避免逗號破欄） */
export const fmtMoney = (n: string | number) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

export type DocRow = { id: string };

/** 詳情面板統一介面（Quote/So/Sr/St 四張已同形） */
export type DocDetailPanelProps = {
  id: string;
  initialMode: 'browse' | 'editItems' | 'editHeader';
  onChanged: () => void | Promise<void>;
  itemIndex: number;
  itemTotal: number;
  onPrevItem?: () => void;
  onNextItem?: () => void;
  onJumpFirst: () => void;
  onJumpLast: () => void;
  onCreate: () => void;
  onSearch: () => void;
};

export type DocCreatePanelProps = { onCreated: (id: string) => void; onCancel: () => void };

export type DocSearchDialogProps<C> = { initial: C; onApply: (c: C) => void; onClose: () => void };

export type DocWorkbenchConfig<T extends DocRow, C> = {
  /** 單據中文名（空狀態文字「請先回資料瀏覽選一張◯◯」用） */
  docLabel: string;
  /** localStorage 欄序 / 欄寬 記憶 key */
  colOrderKey: string;
  colWidthKey: string;
  defaultWidths: Record<string, number>;
  /** 查詢條件初始值（清除時也回到這個） */
  emptyCriteria: C;
  /** 依查詢條件抓列表（criteria → API 參數的對應在各單據自己收） */
  fetchList: (c: C) => Promise<{ items: T[]; total: number }>;
  /** 列表欄位定義（請用模組層 const 或 useMemo，避免每 render 重建） */
  columns: MasterTableColumn<T>[];
  /**
   * 工具列「刪除/作廢/取消」動作：守衛、確認、呼 API 全由單據自理
   * （四張的守衛狀態 / 確認方式（prompt 原因 vs confirm）/ API 都不同）
   */
  deleteRow: (row: T, reload: () => Promise<void>) => void;
  /** CSV 匯出（PDF / 列印一律先跳「開發中」） */
  exportCsv: { filename: string; header: string[]; line: (r: T) => (string | number)[] };
  CreatePanel: ComponentType<DocCreatePanelProps>;
  DetailPanel: ComponentType<DocDetailPanelProps>;
  SearchDialog: ComponentType<DocSearchDialogProps<C>>;
};

function countCriteria(c: object): number {
  return Object.values(c).filter((v) => v != null && String(v).trim() !== '').length;
}

export function DocWorkbench<T extends DocRow, C extends object>({
  config,
  initialId,
  initialTab = 'list',
  initialCreate = false,
}: {
  config: DocWorkbenchConfig<T, C>;
  initialId?: string;
  initialTab?: MasterTab;
  initialCreate?: boolean;
}) {
  const { CreatePanel, DetailPanel, SearchDialog } = config;
  const [tab, setTab] = useState<MasterTab>(initialId || initialCreate ? 'detail' : initialTab);
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(initialCreate);
  const [enterEditItems, setEnterEditItems] = useState(false); // 建單後一次性：詳情開在「編輯明細」
  const [enterEditHeader, setEnterEditHeader] = useState(false); // 列表按「編輯」一次性：詳情開在「編輯表頭」
  const [searchOpen, setSearchOpen] = useState(false);
  const [criteria, setCriteria] = useState<C>(config.emptyCriteria);
  const [sortKey, setSortKey] = useState<string | null>('docNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [colOrder, setColOrder] = useState<string[] | null>(() => loadJSON<string[]>(config.colOrderKey));
  const [colWidths, setColWidths] = useState<Record<string, number>>(
    () => loadJSON<Record<string, number>>(config.colWidthKey) ?? config.defaultWidths,
  );

  const fetchList = config.fetchList;
  const reload = useCallback(async () => {
    try {
      const resp = await fetchList(criteria);
      setRows(resp.items);
      setTotal(resp.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '列表載入失敗');
    }
  }, [criteria, fetchList]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // 一次性旗標：回到資料瀏覽即清掉，避免之後重開同筆又被帶進編輯
  useEffect(() => {
    if (tab === 'list') {
      if (enterEditItems) setEnterEditItems(false);
      if (enterEditHeader) setEnterEditHeader(false);
    }
  }, [tab, enterEditItems, enterEditHeader]);

  // 排序（篩選走伺服器端：查詢彈窗）
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

  // 預設永遠選一筆（第一筆）
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
  // 列表「編輯」→ 進詳情並開在編輯表頭模式
  const openEdit = () => {
    if (selectedId) openDetail(selectedId, { editHeader: true });
  };
  const startCreate = () => {
    setCreating(true);
    setTab('detail');
  };

  // 選中列捲入可視
  useEffect(() => {
    if (tab !== 'list' || !selectedId) return;
    document.querySelector(`[data-row-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId, tab]);

  const handleDelete = () => {
    if (!selected) return;
    config.deleteRow(selected, reload);
  };

  // 全鍵盤：工具列 Alt 快捷（preventDefault 攔住瀏覽器、如 Alt+F 不再開 Chrome 選單）+ ↑↓ 控列
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const inField = !!t && ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName);
      const modalOpen = searchOpen || creating;

      // Alt 系：選單切換 + 工具列字母快捷
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
            d: () => handleDelete(),
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

      if (modalOpen) return; // 彈窗優先
      if (e.ctrlKey || e.metaKey) return;
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
      }
      // 詳細頁的 ↑↓ 由 DetailPanel 接管（選明細列）；換單走工具列 ◀▶
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // selectAt/openDetail/handleDelete/reload 為依當前 render 的閉包；以 disable 略過 deps 檢查
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, creating, searchOpen, displayRows, idx, selectedId]);

  const handleExport = (format: ExportFormat) => {
    if (format !== 'csv') {
      alert('PDF / 列印開發中');
      return;
    }
    const lines = displayRows.map((r) => config.exportCsv.line(r).join(','));
    const csv = '﻿' + [config.exportCsv.header.join(','), ...lines].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = config.exportCsv.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 套用記憶的欄位順序
  const baseColumns = config.columns;
  const columns = useMemo(() => {
    if (!colOrder) return baseColumns;
    const map = new Map(baseColumns.map((c) => [c.key, c]));
    const ordered = colOrder.map((k) => map.get(k)).filter(Boolean) as MasterTableColumn<T>[];
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
              onDelete={handleDelete}
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
                <button onClick={() => setCriteria(config.emptyCriteria)} className="text-muted-foreground hover:underline">
                  清除
                </button>
              </div>
            ) : null}

            {error ? (
              <div className="mx-3 mt-2 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
            ) : null}

            <div className="flex min-h-0 flex-1 flex-col">
              <MasterTable<T>
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
                  saveJSON(config.colOrderKey, next);
                }}
                columnWidths={colWidths}
                onColumnWidthChange={(key, w) => {
                  setColWidths((prev) => {
                    const next = { ...prev, [key]: w };
                    saveJSON(config.colWidthKey, next);
                    return next;
                  });
                }}
                totalCount={total}
              />
            </div>
          </>
        ) : creating ? (
          <CreatePanel
            onCreated={(id) => {
              void reload();
              openDetail(id, { editItems: true }); // 建單後直接進編輯明細
            }}
            onCancel={() => {
              setCreating(false);
              setTab('list');
            }}
          />
        ) : selectedId ? (
          <DetailPanel
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
          <div className="p-6 text-sm text-muted-foreground">請先回資料瀏覽選一張{config.docLabel}。</div>
        )}

        {searchOpen ? (
          <SearchDialog
            initial={criteria}
            onApply={(c) => {
              setCriteria(c);
              setSearchOpen(false);
              setTab('list'); // 查詢結果一律停在資料瀏覽
            }}
            onClose={() => setSearchOpen(false)}
          />
        ) : null}
      </div>
    </TieredFormProvider>
  );
}

/** 查詢彈窗共用：條件列（label + 欄位群） */
export function SearchRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5rem_1fr] items-center gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

/** 查詢彈窗共用外殼：遮罩 + 表單 + 標題列 + 底部（清除全部/取消/查詢）；欄位內容由 children 提供 */
export function SearchDialogShell({
  title,
  onSubmit,
  onClear,
  onClose,
  maxWidthClass = 'max-w-lg',
  children,
}: {
  title: string;
  onSubmit: () => void;
  onClear: () => void;
  onClose: () => void;
  maxWidthClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <form
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className={`relative w-full ${maxWidthClass} space-y-3 rounded-xl border border-border bg-card p-5 shadow-2xl`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
        <div className="flex justify-between pt-2">
          <button type="button" onClick={onClear} className="rounded border px-4 py-1.5 text-sm">
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
