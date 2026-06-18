// apps/nx-ui/src/features/warehouse-zoned/WarehouseZonedPage.tsx
// v1.2 對齊軌 階段 E P4：warehouse 分區編輯 list+detail 容器
//
// 對齊鋼鐵星球範式 + v1.1 §1（PATCH 只送本頁可編欄）
// P4 階段：本元件僅供「主檔中心 zoned demo」/dashboard/master/warehouses/zoned 用、
// 既有 /dashboard/master/warehouses（EntityMasterPage + WAREHOUSE_MASTER config）保留、
// 範式統一決定留 P6 closure STOP-1 由總經理裁定。
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@design/utils/cn';
import {
  WAREHOUSE_FIELDS,
  type WarehouseZone,
} from '@/features/nx01/shell/zones';
import { ConfirmDialog, type ConfirmState } from '@/features/nx01/shell/ui/ConfirmDialog';
import { ToastStack, useToast } from '@/features/nx01/shell/ui/ToastStack';
import {
  ErpToolbar,
  type ErpMode,
  type ExportFormat,
} from '@/features/nx01/shell/ui/ErpToolbar';
import { exportTable } from '@/features/nx01/shell/hooks/useExportTable';
import { SearchPanel } from '@/features/nx01/shell/ui/SearchPanel';
import {
  MasterTable,
  MASTER_TABLE_PAGE_SIZES,
  type MasterTableColumn,
} from '@/features/nx01/shell/ui/MasterTable';
import { MasterDetailScroll, EmptyDetail, SectionHeader } from '@/features/nx01/shell/ui/MasterDetail';
import { FormField } from '@/features/nx01/shell/ui/FormField';
import { PageHeader } from '@design/components/page-header/PageHeader';
import { useDirtyGuard } from '@design/hooks/useDirtyGuard';
import { MasterTabs } from '@/features/nx01/shell/entity-master/MasterTabs';
import { formatDateTimeZh } from '@/features/nx01/shell/entity-master/format';
import { fetchRefOptions } from '@/features/nx01/shell/entity-master/config';
import {
  createWarehouse,
  listWarehouses,
  setWarehouseActive,
  updateWarehouse,
  type WarehouseDto,
} from '@data/endpoints/nx01/api/warehouse';

import { WarehouseFormZoned, type RefOption } from './WarehouseFormZoned';
import {
  emptyWarehouseDraft,
  warehouseDraftToBody,
  warehouseRowToDraft,
  type WarehouseDraft,
} from './helpers';

type Tab = 'list' | 'detail';

export type WarehouseZonedPageProps = {
  pageCategory: string;
  pageTitle: string;
  editableZones?: Set<WarehouseZone>;
  entityNoun: string;
};

export function WarehouseZonedPage({
  pageCategory,
  pageTitle,
  editableZones,
  entityNoun,
}: WarehouseZonedPageProps) {
  const { toasts, showToast } = useToast();

  const [rows, setRows] = useState<WarehouseDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(MASTER_TABLE_PAGE_SIZES[1]);
  const [showInactive, setShowInactive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [loading, setLoading] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<ErpMode>('browse');
  const [tab, setTab] = useState<Tab>('list');
  const [creating, setCreating] = useState(false);
  const [activeZone, setActiveZone] = useState<WarehouseZone>('basic');

  const [draft, setDraft] = useState<WarehouseDraft>({});
  const [original, setOriginal] = useState<WarehouseDraft>({});

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const [refOptions, setRefOptions] = useState<{
    siteId?: RefOption[];
    warehouseTypeId?: RefOption[];
    managerUserId?: RefOption[];
  }>({});

  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKw(keyword), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [site, wType] = await Promise.all([
        fetchRefOptions('nx01/sites'),
        fetchRefOptions('nx01/warehouse-types'),
      ]);
      const userRes = await fetch('/api/nx01/users?pageSize=100&isActive=true', {
        credentials: 'include',
      }).catch(() => null);
      let users: RefOption[] = [];
      if (userRes && userRes.ok) {
        const data = await userRes.json().catch(() => ({}));
        const items = (data.items ?? data.rows ?? []) as Array<{
          id: string;
          userAccount?: string;
          userName?: string;
        }>;
        users = items.map((u) => ({
          value: u.id,
          label: [u.userName, u.userAccount].filter(Boolean).join(' · ') || u.id,
        }));
      }
      if (cancelled) return;
      setRefOptions({
        siteId: toRefOptions(site),
        warehouseTypeId: toRefOptions(wType),
        managerUserId: users,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listWarehouses({
        page,
        pageSize,
        q: debouncedKw,
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
  }, [debouncedKw, page, pageSize, showInactive, reloadTick]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (rows.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!rows.some((r) => r.id === selectedId)) setSelectedId(rows[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const isDirty = useMemo(() => {
    if (mode !== 'edit') return false;
    return Object.keys({ ...draft, ...original }).some(
      (k) => String(draft[k] ?? '') !== String(original[k] ?? ''),
    );
  }, [mode, draft, original]);

  const performCancel = useCallback(() => {
    setMode('browse');
    setCreating(false);
    setDraft({});
    setOriginal({});
    setActiveZone('basic');
  }, []);

  const handleCreate = useCallback(() => {
    const d = emptyWarehouseDraft();
    setCreating(true);
    setSelectedId(null);
    setDraft(d);
    setOriginal(d);
    setMode('edit');
    setTab('detail');
    setActiveZone('basic');
  }, []);

  const handleEdit = useCallback(() => {
    if (!selected) return;
    const d = warehouseRowToDraft(selected);
    setCreating(false);
    setDraft(d);
    setOriginal(d);
    setMode('edit');
    setTab('detail');
  }, [selected]);

  const performSave = useCallback(async () => {
    const requiredFields = WAREHOUSE_FIELDS.filter((f) => {
      if (f.isSatellite) return false;
      if (!f.required) return false;
      if (editableZones && !editableZones.has(f.zone)) return false;
      return true;
    });
    for (const f of requiredFields) {
      const v = String(draft[f.key] ?? '').trim();
      if (!v && f.key !== 'isMain') {
        showToast(`「${f.label}」為必填`, 'danger');
        return;
      }
    }
    const body = warehouseDraftToBody(draft, editableZones, { isCreate: creating });
    try {
      if (creating) {
        const created = await createWarehouse({
          ...body,
          code: String(draft.code ?? '').trim(),
          name: String(draft.name ?? '').trim(),
        });
        showToast(`已新增${entityNoun}`, 'success');
        setReloadTick((t) => t + 1);
        setSelectedId(created.id);
      } else if (selectedId) {
        await updateWarehouse(selectedId, body);
        showToast('已存檔', 'success');
        setReloadTick((t) => t + 1);
      }
      performCancel();
    } catch (e) {
      showToast((e as Error)?.message ?? '存檔失敗', 'danger');
    }
  }, [
    creating,
    draft,
    editableZones,
    entityNoun,
    selectedId,
    performCancel,
    showToast,
  ]);

  const handleSave = useCallback(() => {
    setConfirm({
      title: creating ? `新增${entityNoun}` : '存檔變更',
      message: creating
        ? `確定新增這筆${entityNoun}？`
        : `確定儲存對「${selected?.name ?? ''}」的變更？`,
      confirmLabel: '存檔',
      onConfirm: () => void performSave(),
    });
  }, [creating, entityNoun, selected, performSave]);

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
    const turningOff = selected.isActive;
    const label = selected.name;
    setConfirm({
      title: turningOff ? `停用${entityNoun}` : `啟用${entityNoun}`,
      message: turningOff
        ? `確定停用「${label}」？（系統不刪資料、停用後可從「顯示停用」恢復）`
        : `確定重新啟用「${label}」？`,
      confirmLabel: turningOff ? '停用' : '啟用',
      variant: turningOff ? 'danger' : 'default',
      onConfirm: () => {
        void (async () => {
          try {
            await setWarehouseActive(selected.id, !selected.isActive);
            showToast(turningOff ? '已停用' : '已啟用', 'success');
            setReloadTick((t) => t + 1);
          } catch (e) {
            showToast((e as Error)?.message ?? '操作失敗', 'danger');
          }
        })();
      },
    });
  }, [selected, entityNoun, showToast]);

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

  // Phase 2 後續軌:全域 dirty 攔截、編輯模式跨頁跳轉前跳 3-way confirm
  useDirtyGuard(
    () => mode === 'edit' && isDirty,
    useCallback(
      (proceed) => {
        setConfirm({
          title: '尚有未儲存的變更',
          message: '離開此頁要先存檔、還是丟棄變更？',
          confirmLabel: '存檔後離開',
          onConfirm: () => {
            void performSave();
            proceed();
          },
          secondaryAction: {
            label: '丟棄變更',
            variant: 'danger',
            onClick: () => {
              performCancel();
              proceed();
            },
          },
        });
      },
      [performSave, performCancel],
    ),
  );

  const handleExport = useCallback(
    (format: ExportFormat) => {
      // [2-1] 三模式匯出（CSV / PDF / 列印）「所見即所得」
      exportTable(format, {
        title: pageTitle,
        columns: [
          { label: '代碼', get: (r) => r.code },
          { label: '名稱', get: (r) => r.name },
          { label: '據點', get: (r) => r.siteName ?? '' },
          { label: '倉別', get: (r) => r.warehouseTypeName ?? '' },
          { label: '主倉', get: (r) => (r.isMain ? '是' : '否') },
        ],
        rows,
      });
    },
    [rows, pageTitle],
  );

  const toggleSearch = useCallback(() => setSearchOpen((s) => !s), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
      if (mode === 'browse' && tab === 'list' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        if (inFormEl) return;
        if (rows.length === 0) return;
        e.preventDefault();
        const idx = rows.findIndex((r) => r.id === selectedId);
        const cur = idx < 0 ? 0 : idx;
        const nextIdx =
          e.key === 'ArrowDown' ? Math.min(rows.length - 1, cur + 1) : Math.max(0, cur - 1);
        setSelectedId(rows[nextIdx].id);
      }
      if (mode === 'browse' && tab === 'list' && e.key === 'Enter') {
        if (inFormEl) return;
        if (!selected) return;
        e.preventDefault();
        attemptTabChange('detail');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    mode,
    tab,
    rows,
    selectedId,
    selected,
    searchOpen,
    attemptTabChange,
    handleCreate,
    handleEdit,
    handleDelete,
    handleSave,
    handleCancel,
    toggleSearch,
  ]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const columns: MasterTableColumn<WarehouseDto>[] = useMemo(
    () => [
      {
        key: 'code',
        label: '代碼',
        minWidthClass: 'min-w-[100px]',
        render: (row) => <span className="font-mono text-xs">{row.code}</span>,
      },
      {
        key: 'name',
        label: '名稱',
        minWidthClass: 'min-w-[160px]',
        render: (row) => <span>{row.name}</span>,
      },
      {
        key: 'siteName',
        label: '據點',
        minWidthClass: 'min-w-[110px]',
        render: (row) => <span className="text-xs">{row.siteName ?? '—'}</span>,
      },
      {
        key: 'isMain',
        label: '主倉',
        minWidthClass: 'min-w-[60px]',
        render: (row) => (row.isMain ? <span className="text-[#E8A020]">★</span> : <span className="text-[#5A5A60]">—</span>),
      },
      {
        key: 'warehouseTypeName',
        label: '倉別',
        minWidthClass: 'min-w-[80px]',
        render: (row) => <span className="text-xs">{row.warehouseTypeName ?? '—'}</span>,
      },
      {
        key: 'isActive',
        label: '狀態',
        minWidthClass: 'min-w-[80px]',
        render: (row) => (
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                'size-2 rounded-full',
                row.isActive
                  ? 'bg-[#22D88F] shadow-[0_0_8px_#22D88F]'
                  : 'bg-[#E26060] shadow-[0_0_8px_#E26060]',
              )}
            />
            <span className={row.isActive ? 'text-[#22D88F]' : 'text-[#E26060]'}>
              {row.isActive ? '啟用' : '停用'}
            </span>
          </span>
        ),
      },
    ],
    [],
  );

  const countText = `${total} 筆${entityNoun}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-foreground">
      <PageHeader category={pageCategory} title={pageTitle} count={countText} />
      <MasterTabs tab={tab} onChange={attemptTabChange} />
      <div className="overflow-x-auto">
        <ErpToolbar
          mode={mode}
          hasActiveRow={!!selected}
          selectedRowActive={selected?.isActive ?? true}
          selectedRowBuiltin={(selected as { isBuiltin?: boolean } | null)?.isBuiltin ?? false}
          selectionMode={false}
          onToggleSelection={() => {}}
          selectedCount={0}
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
          onShowInactiveChange={mode === 'browse' && tab === 'list' ? setShowInactive : undefined}
          onBatchEnable={() => {}}
          onBatchDisable={() => {}}
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
        placeholder={`搜尋${entityNoun}代碼 / 名稱 / 備註...`}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'list' ? (
          <MasterTable<WarehouseDto>
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpenDetail={(id) => {
              setSelectedId(id);
              attemptTabChange('detail');
            }}
            selectionMode={false}
            checked={new Set()}
            setChecked={() => {}}
            pageSize={pageSize}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
            footerHint={loading ? '載入中...' : undefined}
            totalCount={total}
          />
        ) : (
          <DetailPane
            creating={creating}
            mode={mode}
            selected={selected}
            draft={draft}
            setDraft={setDraft}
            activeZone={activeZone}
            setActiveZone={setActiveZone}
            editableZones={editableZones}
            refOptions={refOptions}
            entityNoun={entityNoun}
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
  creating,
  mode,
  selected,
  draft,
  setDraft,
  activeZone,
  setActiveZone,
  editableZones,
  refOptions,
  entityNoun,
  onRequestSave,
}: {
  creating: boolean;
  mode: ErpMode;
  selected: WarehouseDto | null;
  draft: WarehouseDraft;
  setDraft: (next: WarehouseDraft) => void;
  activeZone: WarehouseZone;
  setActiveZone: (z: WarehouseZone) => void;
  editableZones?: Set<WarehouseZone>;
  refOptions: {
    siteId?: RefOption[];
    warehouseTypeId?: RefOption[];
    managerUserId?: RefOption[];
  };
  entityNoun: string;
  onRequestSave: () => void;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const editing = mode === 'edit';

  useEffect(() => {
    if (!editing) return;
    const el = formRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, [data-kbd-select], button',
    );
    el?.focus();
  }, [editing, creating, selected?.id, activeZone]);

  const handleFormKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    if (t.tagName.toLowerCase() === 'textarea') return;
    if (t.hasAttribute('data-kbd-select')) return;
    e.preventDefault();
    const els = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>(
        'input, select, textarea, [data-kbd-select]',
      ) ?? [],
    ).filter((el) => !(el as HTMLInputElement).disabled && el.offsetParent !== null);
    const idx = els.indexOf(t);
    if (idx >= 0 && idx < els.length - 1) els[idx + 1]?.focus();
    else onRequestSave();
  };

  if (mode !== 'edit' && !selected) {
    return <EmptyDetail message={`從「資料瀏覽」選一筆，或按 A 新增${entityNoun}`} />;
  }

  return (
    <MasterDetailScroll scrollKey={selected?.id ?? (creating ? '__new__' : null)}>
      <div className="px-4 py-4 sm:px-6">
        <SectionHeader
          title={creating ? `新增${entityNoun}` : selected?.name ?? entityNoun}
          subtitle={editing ? '編輯中' : '瀏覽'}
        />
        <div ref={formRef} data-master-form onKeyDown={handleFormKey} className="mt-4">
          <WarehouseFormZoned
            mode={mode}
            creating={creating}
            draft={draft}
            setDraft={setDraft}
            activeZone={activeZone}
            setActiveZone={setActiveZone}
            editableZones={editableZones}
            refOptions={refOptions}
          />
        </div>
        {!creating && selected ? (
          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-[#2A2A30] pt-4 sm:grid-cols-2">
            <FormField
              label="建立時間"
              value={formatDateTimeZh(selected.createdAt)}
              mono
              dim
            />
            <FormField
              label="建立人員"
              value={auditPerson(selected.createdByUsername, selected.createdByName)}
              dim
            />
            <FormField
              label="修改時間"
              value={formatDateTimeZh(selected.updatedAt)}
              mono
              dim
            />
            <FormField
              label="修改人員"
              value={auditPerson(selected.updatedByUsername, selected.updatedByName)}
              dim
            />
          </div>
        ) : null}
      </div>
    </MasterDetailScroll>
  );
}

function auditPerson(username: unknown, name: unknown): string {
  const n = (name as string) || '';
  const u = (username as string) || '';
  if (n && u) return `${n}（${u}）`;
  return n || u || '—';
}

function toRefOptions(
  raw: Array<{ value: string | number; label: string }>,
): RefOption[] {
  return raw.map((o) => ({ value: String(o.value), label: o.label }));
}
