// apps/nx-ui/src/features/master-shell/entity-master/EntityMasterPage.tsx
/**
 * EntityMasterPage — 鋼鐵星球 config-driven 通用主檔頁
 *
 * 對齊 USER 主檔已驗證範式：鋼鐵星球視覺 + ERP 工具列 + 編輯模式 staged write +
 * dirty state 攔截 + 3-way confirm + 軟刪除（系統不刪資料）+ 全鍵盤 + 手機 responsive。
 *
 * 用一份 EntityMasterConfig 即可套用平面 code 主檔（幣別 / 國家 / 零件群組 / 車體類型 …）。
 *
 * 介面（單欄 + Tab list/detail，桌面手機一致、天然 responsive）：
 * - 列表 Tab（Alt+1）：MasterTable + ↑↓ 切列 + Enter 進詳細
 * - 詳細 Tab（Alt+2）：瀏覽 FormField / 編輯 FormInput
 * - 工具列：A 新增 / E 更正 / F 查詢 / D 停用-啟用 / 匯出 / R 重新整理 / 選取批次 / Q 結束
 * - 編輯模式：S 存檔 / C 取消（dirty 時跳「存檔後離開 / 丟棄 / 取消」3 選 1）
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MasterTopBar } from './MasterTopBar';
import { MasterTabs } from './MasterTabs';
import { formatDateTimeZh } from './format';
import {
  ErpToolbar,
  type ErpMode,
} from '@/features/master-shell/ui/ErpToolbar';
import { exportTable, type ExportFormat } from '@/features/master-shell/hooks/useExportTable';
import { SearchPanel } from '@/features/master-shell/ui/SearchPanel';
import {
  MasterTable,
  MASTER_TABLE_PAGE_SIZES,
  type MasterTableColumn,
} from '@/features/master-shell/ui/MasterTable';
import { ConfirmDialog, type ConfirmState } from '@/features/master-shell/ui/ConfirmDialog';
import { ToastStack, useToast } from '@/features/master-shell/ui/ToastStack';
import { MasterDetailScroll, SectionHeader, EmptyDetail } from '@/features/master-shell/ui/MasterDetail';
import { FormField, FormInput } from '@/features/master-shell/ui/FormField';
import { KeyboardSelect } from '@/features/master-shell/ui/KeyboardSelect';
import {
  MasterColumnsPanel,
  MasterFilterPanel,
  rowMatchesFilters,
  type FilterCond,
  type FilterFieldDef,
} from '@/features/master-shell/ui/MasterTableTools';

import {
  type EntityMasterConfig,
  type EntityRow,
  type EntityDraft,
  type EntityFieldDef,
  type SelectOption,
  fetchEntityList,
  createEntity,
  updateEntity,
  setEntityActive,
  fetchRefOptions,
  rowToDraft,
  emptyDraft,
  draftToBody,
} from './config';

/** select / ref 欄位的顯示標籤（列表 + 瀏覽詳細共用） */
function optionLabel(
  f: EntityFieldDef,
  raw: unknown,
  refOptions: Record<string, SelectOption[]>,
): string {
  if (raw == null || raw === '') return '—';
  if (f.type === 'select' && f.options) {
    return f.options.find((x) => String(x.value) === String(raw))?.label ?? String(raw);
  }
  if (f.type === 'ref') {
    const opts = refOptions[f.key] ?? [];
    return opts.find((x) => String(x.value) === String(raw))?.label ?? String(raw);
  }
  return String(raw);
}

type Tab = 'list' | 'detail';

function formatDt(iso: unknown): string {
  return formatDateTimeZh(iso);
}

function auditPerson(username: unknown, name: unknown): string {
  const n = (name as string) || '';
  const u = (username as string) || '';
  if (n && u) return `${n}（${u}）`;
  return n || u || '—';
}

function listFields(cfg: EntityMasterConfig): EntityFieldDef[] {
  return cfg.fields.filter((f) => f.inList !== false);
}

export function EntityMasterPage({ config }: { config: EntityMasterConfig }) {
  const router = useRouter();
  const { toasts, showToast } = useToast();

  // 資料 / 分頁 / 篩選
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(MASTER_TABLE_PAGE_SIZES[1]);
  const [showInactive, setShowInactive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [loading, setLoading] = useState(false);

  // 選列 / 模式 / Tab
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<ErpMode>('browse');
  const [tab, setTab] = useState<Tab>('list');
  const [creating, setCreating] = useState(false);

  // 編輯 staged draft
  const [draft, setDraft] = useState<EntityDraft>({});
  const [original, setOriginal] = useState<EntityDraft>({});

  // 批次選取
  const [selectionMode, setSelectionMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // 確認框
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  // 外鍵下拉選項（ref 欄位）
  const [refOptions, setRefOptions] = useState<Record<string, SelectOption[]>>({});

  // 欄位設定（Alt+L）/ 篩選（Alt+T）
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterCond[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const sidebarRef = useRef<HTMLElement>(null);

  // 欄位 / 篩選共用的「欄位清單」（列表欄位 + 狀態欄）
  const toolFields: FilterFieldDef[] = useMemo(
    () => [...listFields(config).map((f) => ({ key: f.key, label: f.label })), { key: 'isActive', label: '狀態' }],
    [config],
  );

  // 取某列某欄的「顯示文字」（select / ref 取 label、toggle 取是/否、狀態取啟用/停用）
  const getCellText = useCallback(
    (row: EntityRow, key: string): string => {
      if (key === 'isActive') return row.isActive ? '啟用' : '停用';
      const f = config.fields.find((x) => x.key === key);
      if (!f) return String(row[key] ?? '');
      if (f.type === 'toggle') return row[key] ? '是' : '否';
      if (f.type === 'select' || f.type === 'ref') return optionLabel(f, row[key], refOptions);
      return String(row[key] ?? '');
    },
    [config, refOptions],
  );

  // 前端篩選：就目前載入的資料列套用（pagination 仍為後端）
  const displayRows = useMemo(
    () =>
      filters.length === 0
        ? rows
        : rows.filter((r) => rowMatchesFilters(filters, (k) => getCellText(r, k))),
    [rows, filters, getCellText],
  );

  const selected = useMemo(
    () => displayRows.find((r) => r.id === selectedId) ?? null,
    [displayRows, selectedId],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // search debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKw(keyword), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  // 載入外鍵下拉選項（ref 欄位）
  useEffect(() => {
    const refFields = config.fields.filter((f) => f.type === 'ref' && f.refBasePath);
    if (refFields.length === 0) return;
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        refFields.map(async (f) => {
          const opts = await fetchRefOptions(f.refBasePath as string, f.refLabelKeys);
          return [f.key, opts] as const;
        }),
      );
      if (!cancelled) setRefOptions(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [config]);

  // load
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchEntityList(config, {
        search: debouncedKw,
        page,
        pageSize,
        isActive: showInactive ? undefined : true,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      showToast((e as Error)?.message ?? '載入失敗', 'danger');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, debouncedKw, page, pageSize, showInactive, reloadTick]);

  useEffect(() => {
    void load();
  }, [load]);

  // 瀏覽模式自動鎖定第一列（進頁面不需點選即可 ↑↓；詳細頁也不再跳「請先選擇」）
  useEffect(() => {
    if (displayRows.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!displayRows.some((r) => r.id === selectedId)) setSelectedId(displayRows[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayRows]);

  // 選中列捲入視野（鍵盤 ↑↓ 切列時）
  useEffect(() => {
    if (!selectedId || tab !== 'list') return;
    document.querySelector(`[data-row-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId, tab]);

  // dirty 判斷（編輯模式）
  const isDirty = useMemo(() => {
    if (mode !== 'edit') return false;
    const keys = config.fields.map((f) => f.key);
    return keys.some((k) => String(draft[k] ?? '') !== String(original[k] ?? ''));
  }, [mode, draft, original, config.fields]);

  // ── 動作 ──────────────────────────────────────────────
  const performCancel = useCallback(() => {
    setMode('browse');
    setCreating(false);
    setDraft({});
    setOriginal({});
  }, []);

  const handleCreate = useCallback(() => {
    if (config.readOnly || config.canCreate === false) {
      showToast(`${config.entityNoun}為系統設定、不可新增`, 'info');
      return;
    }
    const d = emptyDraft(config);
    setCreating(true);
    setSelectedId(null);
    setDraft(d);
    setOriginal(d);
    setMode('edit');
    setTab('detail');
  }, [config, showToast]);

  const handleEdit = useCallback(() => {
    if (!selected) return;
    if (config.readOnly) {
      showToast(`${config.entityNoun}為系統唯讀資料`, 'info');
      return;
    }
    const d = rowToDraft(config, selected);
    setCreating(false);
    setDraft(d);
    setOriginal(d);
    setMode('edit');
    setTab('detail');
  }, [config, selected, showToast]);

  const performSave = useCallback(async () => {
    // 必填驗證
    for (const f of config.fields) {
      if (f.required && f.type !== 'toggle') {
        const v = String(draft[f.key] ?? '').trim();
        if (!v) {
          showToast(`「${f.label}」為必填`, 'danger');
          return;
        }
      }
    }
    const body = draftToBody(config, draft);
    try {
      if (creating) {
        const created = await createEntity(config, body);
        showToast(`已新增${config.entityNoun}`, 'success');
        setReloadTick((t) => t + 1);
        setSelectedId(created.id);
      } else if (selectedId) {
        await updateEntity(config, selectedId, body);
        showToast('已存檔', 'success');
        setReloadTick((t) => t + 1);
      }
      performCancel();
    } catch (e) {
      showToast((e as Error)?.message ?? '存檔失敗', 'danger');
    }
  }, [config, draft, creating, selectedId, performCancel, showToast]);

  const handleSave = useCallback(() => {
    setConfirm({
      title: creating ? `新增${config.entityNoun}` : '存檔變更',
      message: creating
        ? `確定新增這筆${config.entityNoun}？`
        : `確定儲存對「${(selected?.[config.fields[0].key] as string) ?? ''}」的變更？`,
      confirmLabel: '存檔',
      onConfirm: () => void performSave(),
    });
  }, [creating, config, selected, performSave]);

  const handleCancel = useCallback(() => {
    if (!isDirty) {
      performCancel();
      return;
    }
    setConfirm({
      title: '尚有未儲存的變更',
      message: '要先存檔再離開，還是丟棄變更？',
      confirmLabel: '存檔後離開',
      onConfirm: () => void performSave(),
      secondaryAction: { label: '丟棄變更', variant: 'danger', onClick: performCancel },
    });
  }, [isDirty, performCancel, performSave]);

  const handleDelete = useCallback(() => {
    if (!selected) return;
    if (config.readOnly) {
      showToast(`${config.entityNoun}為系統唯讀資料`, 'info');
      return;
    }
    const turningOff = selected.isActive;
    const label = (selected[config.fields[0].key] as string) ?? selected.id;
    setConfirm({
      title: turningOff ? `停用${config.entityNoun}` : `啟用${config.entityNoun}`,
      message: turningOff
        ? `確定停用「${label}」？（系統不刪資料、停用後可從「顯示停用」恢復）`
        : `確定重新啟用「${label}」？`,
      confirmLabel: turningOff ? '停用' : '啟用',
      variant: turningOff ? 'danger' : 'default',
      onConfirm: () => {
        void (async () => {
          try {
            await setEntityActive(config, selected.id, !selected.isActive);
            showToast(turningOff ? '已停用' : '已啟用', 'success');
            setReloadTick((t) => t + 1);
          } catch (e) {
            showToast((e as Error)?.message ?? '操作失敗', 'danger');
          }
        })();
      },
    });
  }, [selected, config, showToast]);

  const handleBatchSetActive = useCallback(
    (active: boolean) => {
      const ids = Array.from(checked);
      if (ids.length === 0) return;
      void (async () => {
        let ok = 0;
        for (const id of ids) {
          try {
            await setEntityActive(config, id, active);
            ok += 1;
          } catch {
            /* 個別失敗略過、最後彙總 */
          }
        }
        showToast(`已${active ? '啟用' : '停用'} ${ok}/${ids.length} 筆`, ok === ids.length ? 'success' : 'danger');
        setChecked(new Set());
        setSelectionMode(false);
        setReloadTick((t) => t + 1);
      })();
    },
    [checked, config, showToast],
  );

  const attemptTabChange = useCallback(
    (next: Tab) => {
      if (mode === 'edit' && isDirty) {
        setConfirm({
          title: '尚有未儲存的變更',
          message: '離開編輯要先存檔，還是丟棄變更？',
          confirmLabel: '存檔後離開',
          onConfirm: () => {
            void performSave();
            setTab(next);
          },
          secondaryAction: {
            label: '丟棄變更',
            variant: 'danger',
            onClick: () => {
              performCancel();
              setTab(next);
            },
          },
        });
        return;
      }
      setTab(next);
    },
    [mode, isDirty, performSave, performCancel],
  );

  // [1-2] 2026-06-05：handleExit / Alt+Q 已移除（離開主檔改走星球選單 Alt+X）

  // 模組選單 / 公告等跳轉：編輯中且 dirty 先 3-way confirm（Next client 導航不觸發 beforeunload）
  const requestNavigate = useCallback(
    (href: string) => {
      if (mode === 'edit' && isDirty) {
        setConfirm({
          title: '尚有未儲存的變更',
          message: '離開此頁要先存檔，還是丟棄變更？',
          confirmLabel: '存檔後離開',
          onConfirm: () => {
            void performSave();
            router.push(href);
          },
          secondaryAction: {
            label: '丟棄變更',
            variant: 'danger',
            onClick: () => {
              performCancel();
              router.push(href);
            },
          },
        });
        return;
      }
      router.push(href);
    },
    [mode, isDirty, performSave, performCancel, router],
  );

  const handleExport = useCallback(
    (format: ExportFormat) => {
      // [2-1] 匯出三模式（CSV / PDF / 列印）「所見即所得」：只匯出可見欄位 + 篩選後資料列
      const cols = listFields(config)
        .filter((c) => !hiddenCols.has(c.key))
        .map((c) => ({ label: c.label, get: (r: EntityRow) => getCellText(r, c.key) }));
      exportTable(format, {
        title: config.title ?? config.basePath.replace(/\//g, ''),
        columns: cols,
        rows: displayRows,
      });
    },
    [config, displayRows, hiddenCols, getCellText],
  );

  // 三個工具列下方面板互斥開關（搜尋 / 欄位 / 篩選只開一個）
  const toggleSearch = useCallback(() => {
    setSearchOpen((s) => !s);
    setColumnsOpen(false);
    setFilterOpen(false);
  }, []);
  const toggleColumns = useCallback(() => {
    setColumnsOpen((o) => !o);
    setSearchOpen(false);
    setFilterOpen(false);
  }, []);
  const toggleFilter = useCallback(() => {
    setFilterOpen((o) => !o);
    setSearchOpen(false);
    setColumnsOpen(false);
  }, []);

  // ── 全鍵盤 ────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 編輯輸入框內不攔截一般鍵（Alt 組合仍處理）
      if (e.altKey) {
        const k = e.key.toLowerCase();
        const map: Record<string, () => void> = {
          '1': () => attemptTabChange('list'),
          '2': () => attemptTabChange('detail'),
        };
        if (mode === 'browse') {
          Object.assign(map, {
            a: handleCreate,
            e: () => selected && handleEdit(),
            f: toggleSearch,
            d: () => selected && handleDelete(),
            r: () => setReloadTick((t) => t + 1),
            l: toggleColumns,
            t: toggleFilter,
          });
        } else {
          Object.assign(map, { s: handleSave, c: handleCancel });
        }
        const fn = map[k];
        if (fn) {
          e.preventDefault();
          fn();
        }
        return;
      }
      if (e.key === 'Escape') {
        if (searchOpen) {
          setSearchOpen(false);
          setKeyword('');
        } else if (mode === 'edit') {
          handleCancel();
        }
        return;
      }
      const focusTag = (document.activeElement?.tagName ?? '').toLowerCase();
      const inFormEl = focusTag === 'input' || focusTag === 'select' || focusTag === 'textarea';
      // 瀏覽模式 ↑↓ 切列（焦點不在搜尋框 / 下拉等表單元素時）
      if (mode === 'browse' && tab === 'list' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        if (inFormEl) return;
        if (displayRows.length === 0) return;
        e.preventDefault();
        const idx = displayRows.findIndex((r) => r.id === selectedId);
        const cur = idx < 0 ? 0 : idx;
        const nextIdx =
          e.key === 'ArrowDown' ? Math.min(displayRows.length - 1, cur + 1) : Math.max(0, cur - 1);
        setSelectedId(displayRows[nextIdx].id);
      }
      // 瀏覽模式：選中列按 Enter → 進詳細資料（瀏覽），對齊 ERP muscle memory
      if (mode === 'browse' && tab === 'list' && e.key === 'Enter') {
        if (inFormEl) return;
        if (!selected) return;
        e.preventDefault();
        attemptTabChange('detail');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, tab, displayRows, selectedId, selected, searchOpen, attemptTabChange, handleCreate, handleEdit, handleDelete, handleSave, handleCancel, toggleSearch, toggleColumns, toggleFilter]);

  // beforeunload（dirty 攔截）
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── 列表欄位 ──────────────────────────────────────────
  const columns: MasterTableColumn<EntityRow>[] = useMemo(() => {
    const cols: MasterTableColumn<EntityRow>[] = listFields(config).map((f) => ({
      key: f.key,
      label: f.label,
      minWidthClass: f.minWidthClass,
      sortable: false,
      render: (row: EntityRow) =>
        f.type === 'toggle' ? (
          (row[f.key] as boolean) ? '是' : '否'
        ) : f.type === 'select' || f.type === 'ref' ? (
          <span>{optionLabel(f, row[f.key], refOptions)}</span>
        ) : (
          <span className={f.mono ? 'font-mono text-xs' : undefined}>
            {String(row[f.key] ?? '—')}
          </span>
        ),
    }));
    cols.push({
      key: 'isActive',
      label: '狀態',
      minWidthClass: 'min-w-[80px]',
      render: (row: EntityRow) => (
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              'size-2 rounded-full',
              row.isActive ? 'bg-[#22D88F] shadow-[0_0_8px_#22D88F]' : 'bg-[#E26060] shadow-[0_0_8px_#E26060]',
            )}
          />
          <span className={row.isActive ? 'text-[#22D88F]' : 'text-[#E26060]'}>
            {row.isActive ? '啟用' : '停用'}
          </span>
        </span>
      ),
    });
    return cols;
  }, [config, refOptions]);

  // 套用「欄位設定」隱藏欄
  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenCols.has(c.key)),
    [columns, hiddenCols],
  );

  // ── render ────────────────────────────────────────────
  const countText = `${total} 筆${config.entityNoun}`;

  return (
    <div
      className="flex h-dvh flex-col text-[#E8E8EB]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at top, #11111A 0%, #0A0A0C 35%, #06060A 100%)',
      }}
    >
      {/* 置頂列：返回 · 模組選單 · 標題 · 計數 · 公告 · 通知 · 使用者 */}
      <MasterTopBar
        category={config.category}
        title={config.title}
        count={countText}
        requestNavigate={requestNavigate}
      />

      {/* Tab 切換（共用 MasterTabs、與使用者主檔頁一致） */}
      <MasterTabs tab={tab} onChange={attemptTabChange} />

      {/* Toolbar（手機橫向 scroll） */}
      <div className="overflow-x-auto">
        <ErpToolbar
          mode={mode}
          hasActiveRow={!!selected}
          selectedRowActive={selected?.isActive ?? true}
          selectionMode={selectionMode}
          onToggleSelection={() => {
            setSelectionMode((s) => !s);
            setChecked(new Set());
          }}
          selectedCount={checked.size}
          page={page}
          totalPages={totalPages}
          onPageChange={(p) => setPage(Math.min(Math.max(1, p), totalPages))}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onSearch={toggleSearch}
          onDelete={handleDelete}
          onExport={handleExport}
          onRefresh={() => setReloadTick((t) => t + 1)}
          onSave={handleSave}
          onCancel={handleCancel}
          showInactive={showInactive}
          onShowInactiveChange={mode === 'browse' && tab === 'list' ? (v) => setShowInactive(v) : undefined}
          onBatchEnable={() => handleBatchSetActive(true)}
          onBatchDisable={() => handleBatchSetActive(false)}
          onOpenColumns={mode === 'browse' && tab === 'list' ? toggleColumns : undefined}
          onOpenFilter={mode === 'browse' && tab === 'list' ? toggleFilter : undefined}
          columnsHiddenCount={hiddenCols.size}
          filterCount={filters.length}
        />
      </div>

      <SearchPanel
        open={searchOpen}
        value={keyword}
        onChange={setKeyword}
        onClose={() => {
          setSearchOpen(false);
          setKeyword('');
        }}
        placeholder={`搜尋${config.entityNoun}代碼 / 名稱...`}
      />

      <MasterColumnsPanel
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        columns={toolFields}
        hidden={hiddenCols}
        onChange={setHiddenCols}
      />
      <MasterFilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        fields={toolFields}
        value={filters}
        onApply={setFilters}
      />

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'list' ? (
          <MasterTable<EntityRow>
            columns={visibleColumns}
            rows={displayRows}
            getRowId={(r) => r.id}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpenDetail={(id) => {
              setSelectedId(id);
              attemptTabChange('detail');
            }}
            selectionMode={selectionMode}
            checked={checked}
            setChecked={setChecked}
            pageSize={pageSize}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
            footerHint={
              loading
                ? '載入中...'
                : filters.length > 0
                  ? `篩選 ${filters.length} 條件 · 符合 ${displayRows.length} 筆（僅就本頁套用）`
                  : undefined
            }
            totalCount={total}
          />
        ) : (
          <DetailPane
            config={config}
            mode={mode}
            creating={creating}
            selected={selected}
            draft={draft}
            setDraft={setDraft}
            refOptions={refOptions}
            onRequestSave={handleSave}
          />
        )}
      </div>

      <ToastStack toasts={toasts} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
      <nav ref={sidebarRef} className="sr-only" aria-hidden />
    </div>
  );
}

function DetailPane({
  config,
  mode,
  creating,
  selected,
  draft,
  setDraft,
  refOptions,
  onRequestSave,
}: {
  config: EntityMasterConfig;
  mode: ErpMode;
  creating: boolean;
  selected: EntityRow | null;
  draft: EntityDraft;
  setDraft: (next: EntityDraft) => void;
  refOptions: Record<string, SelectOption[]>;
  onRequestSave: () => void;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const editing = mode === 'edit';

  // 進編輯模式自動 focus 第一格（讓 Enter 跳格從第一格開始）
  useEffect(() => {
    if (!editing) return;
    const el = formRef.current?.querySelector<HTMLElement>('input, select, textarea, [data-kbd-select]');
    el?.focus();
  }, [editing, creating, selected?.id]);

  // ERP muscle memory：Enter 跳下一格；最後一格 Enter → 存檔確認。textarea 例外（換行）。
  // 下拉欄位（KeyboardSelect）自行處理 Enter（展開 / 確認+跳格、stopPropagation），不會走到這裡。
  const handleFormKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    if (t.tagName.toLowerCase() === 'textarea') return;
    if (t.hasAttribute('data-kbd-select')) return; // 交給 KeyboardSelect 自己處理
    e.preventDefault();
    const els = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>('input, select, textarea, [data-kbd-select]') ?? [],
    ).filter((el) => !(el as HTMLInputElement).disabled && el.offsetParent !== null);
    const idx = els.indexOf(t);
    if (idx >= 0 && idx < els.length - 1) els[idx + 1]?.focus();
    else onRequestSave();
  };

  if (mode !== 'edit' && !selected) {
    return <EmptyDetail message="從「資料瀏覽」選一筆，或按 A 新增" />;
  }
  return (
    <MasterDetailScroll scrollKey={selected?.id ?? (creating ? '__new__' : null)}>
      <div className="px-4 py-4 sm:px-6">
        <SectionHeader
          title={creating ? `新增${config.entityNoun}` : (selected?.[config.fields[0].key] as string) ?? config.entityNoun}
          subtitle={editing ? '編輯中' : '瀏覽'}
        />
        <div ref={formRef} data-master-form onKeyDown={handleFormKey} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {config.fields.map((f) => {
            // 計算欄位（唯讀即時預覽，如料號分段預覽）：編輯時讀 draft、瀏覽時讀 row
            if (f.type === 'computed') {
              const val = f.compute?.(editing ? draft : ((selected as Record<string, unknown>) ?? {})) ?? '';
              return <FormField key={f.key} label={f.label} value={val || '—'} mono />;
            }
            const lockedNow = editing && !creating && f.lockedOnEdit;
            // 編輯模式：select / ref 下拉（全鍵盤 KeyboardSelect：Enter 展開→↑↓選→Enter 確認+跳格→Esc 關）
            if (editing && !lockedNow && (f.type === 'select' || f.type === 'ref')) {
              const opts = f.type === 'select' ? (f.options ?? []) : (refOptions[f.key] ?? []);
              const baseOpts = opts.map((o) => ({ value: String(o.value), label: o.label }));
              // 非必填提供「清除」選項（對齊原 native 空白 option）；options 已含空值則不重複加
              const hasEmpty = baseOpts.some((o) => o.value === '');
              const selOpts = f.required || hasEmpty
                ? baseOpts
                : [{ value: '', label: f.placeholder ?? '（無）' }, ...baseOpts];
              return (
                <div key={f.key} className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">
                    {f.label + (f.required ? ' *' : '')}
                  </span>
                  <KeyboardSelect
                    value={String(draft[f.key] ?? '')}
                    options={selOpts}
                    placeholder={f.placeholder ?? (f.required ? '請選擇...' : '（無）')}
                    ariaLabel={f.label}
                    onChange={(v) => setDraft({ ...draft, [f.key]: v })}
                  />
                </div>
              );
            }
            // 編輯模式：textarea / json（長文 / JSON 巢狀）
            if (editing && !lockedNow && (f.type === 'textarea' || f.type === 'json')) {
              return (
                <div key={f.key} className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">
                    {f.label + (f.required ? ' *' : '') + (f.type === 'json' ? '（JSON 陣列）' : '')}
                  </span>
                  <textarea
                    value={String(draft[f.key] ?? '')}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    rows={f.type === 'json' ? 8 : 4}
                    placeholder={f.placeholder}
                    className={cn(
                      'rounded-md border border-[#E8A020]/30 bg-[#0A0A0C] px-2.5 py-1.5 text-sm text-[#E8E8EB] outline-none transition-colors placeholder:text-[#5A5A60] focus:border-[#E8A020]/60 focus:ring-1 focus:ring-[#E8A020]/40',
                      f.type === 'json' && 'font-mono text-xs',
                    )}
                  />
                </div>
              );
            }
            // 編輯模式：text / number
            if (editing && !lockedNow && f.type !== 'toggle') {
              return (
                <FormInput
                  key={f.key}
                  label={f.label + (f.required ? ' *' : '')}
                  value={String(draft[f.key] ?? '')}
                  onChange={(v) => setDraft({ ...draft, [f.key]: v })}
                  placeholder={f.placeholder}
                />
              );
            }
            // 編輯模式：toggle
            if (editing && f.type === 'toggle') {
              const on = Boolean(draft[f.key]);
              return (
                <div key={f.key} className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">{f.label}</span>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, [f.key]: !on })}
                    className={cn(
                      'inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors',
                      on
                        ? 'border-[#22D88F]/40 bg-[#22D88F]/10 text-[#22D88F]'
                        : 'border-[#E26060]/40 bg-[#E26060]/10 text-[#E26060]',
                    )}
                  >
                    {on ? '啟用' : '停用'}
                  </button>
                </div>
              );
            }
            // 瀏覽 / locked 欄位
            const raw = editing ? draft[f.key] : selected?.[f.key];
            const val =
              f.type === 'toggle'
                ? (raw ? '啟用' : '停用')
                : f.type === 'select' || f.type === 'ref'
                  ? optionLabel(f, raw, refOptions)
                  : f.type === 'json'
                    ? (raw == null || raw === '' ? '—' : typeof raw === 'string' ? raw : JSON.stringify(raw))
                    : String(raw ?? '—');
            return (
              <FormField
                key={f.key}
                label={f.label}
                value={val === '' ? '—' : val}
                mono={f.mono}
                tone={f.type === 'toggle' ? (raw ? 'green' : 'red') : undefined}
              />
            );
          })}
        </div>

        {/* audit（瀏覽既有資料時） */}
        {!creating && selected ? (
          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-[#2A2A30] pt-4 sm:grid-cols-2">
            <FormField label="建立時間" value={formatDt(selected.createdAt)} mono dim />
            <FormField label="建立人員" value={auditPerson(selected.createdByUsername, selected.createdByName)} dim />
            <FormField label="修改時間" value={formatDt(selected.updatedAt)} mono dim />
            <FormField label="修改人員" value={auditPerson(selected.updatedByUsername, selected.updatedByName)} dim />
          </div>
        ) : null}
      </div>
    </MasterDetailScroll>
  );
}
